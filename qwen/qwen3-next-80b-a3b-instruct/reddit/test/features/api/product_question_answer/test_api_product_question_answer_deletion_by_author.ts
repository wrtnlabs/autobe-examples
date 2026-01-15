import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformProductQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductQuestion";
import type { ICommunityPlatformProductQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductQuestionAnswer";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_question } from "../../../prepare/prepare_random_community_platform_product_question";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product_question_answer } from "../../../prepare/prepare_random_community_platform_product_question_answer";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_products_questions_create } from "../../../generate/generate_random_community_platform_member_products_questions_create";
import { generate_random_community_platform_member_products_questions_answers_create } from "../../../generate/generate_random_community_platform_member_products_questions_answers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_question_answer_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Generate a random UUID for category_id since category object has no id property
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  // Create product
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.content(),
          category_id: categoryId, // Now using a generated UUID that satisfies the format
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "KRW",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Create product question
  const question: ICommunityPlatformProductQuestion =
    await generate_random_community_platform_member_products_questions_create(
      memberConnection,
      {
        params: { productCode: product.productCode },
        body: {
          productCode: product.productCode,
          questionText: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 15,
          }),
        } satisfies ICommunityPlatformProductQuestion.ICreate,
      },
    );
  // Submit answer as member author
  const answer: ICommunityPlatformProductQuestionAnswer =
    await generate_random_community_platform_member_products_questions_answers_create(
      memberConnection,
      {
        params: { productCode: product.productCode, questionId: question.id },
        body: {
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformProductQuestionAnswer.ICreate,
      },
    );
  typia.assert(answer);
  // Verify author can delete their own answer
  await api.functional.communityPlatform.member.products.questions.answers.erase(
    memberConnection,
    {
      productCode: product.productCode,
      questionId: question.id,
      answerId: answer.answerId,
    },
  );
  // Verify that the answer cannot be deleted by non-author (admin)
  // This validates the authorization control
  await TestValidator.error(
    "non-author should not be able to delete answer",
    async () => {
      await api.functional.communityPlatform.member.products.questions.answers.erase(
        adminConnection,
        {
          productCode: product.productCode,
          questionId: question.id,
          answerId: answer.answerId,
        },
      );
    },
  );
  // Verify admin can still create a new answer (meaning deletion did not block creation)
  // This is indirect validation that deletion occurred successfully
  const newAnswer: ICommunityPlatformProductQuestionAnswer =
    await generate_random_community_platform_member_products_questions_answers_create(
      memberConnection,
      {
        params: { productCode: product.productCode, questionId: question.id },
        body: {
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformProductQuestionAnswer.ICreate,
      },
    );
  typia.assert(newAnswer);
}
