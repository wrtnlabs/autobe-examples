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
export async function test_api_product_question_answer_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection to create product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://admin.example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 2: Create product category (admin action)
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 15,
          }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Step 3: Create product (admin action)
  // Generate a UUID for category_id since the category does not have an id property
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  const generatedProduct: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 30,
          }),
          category_id: categoryId, // Fixed: Use generated UUID instead of category.id
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "KRW",
              amount: typia.random<
                number & tags.Minimum<0> & tags.Type<"uint32">
              >(),
              effective_from: new Date().toISOString(),
              effective_to: null,
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  const productCode: string = generatedProduct.productCode; // Extract productCode after creation
  // Step 4: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://member.example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 5: Submit product question (member action)
  const question: ICommunityPlatformProductQuestion =
    await generate_random_community_platform_member_products_questions_create(
      memberConnection,
      {
        body: {
          productCode: productCode,
          questionText: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformProductQuestion.ICreate,
        params: {
          productCode: productCode,
        },
      },
    );
  // Step 6: Create answer to the product question (member action)
  const answer: ICommunityPlatformProductQuestionAnswer =
    await generate_random_community_platform_member_products_questions_answers_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 15,
            sentenceMax: 40,
          }),
        } satisfies ICommunityPlatformProductQuestionAnswer.ICreate,
        params: {
          productCode: productCode,
          questionId: question.id,
        },
      },
    );
  // Step 7: Retrieve the specific answer using the hierarchical path
  const retrievedAnswer: ICommunityPlatformProductQuestionAnswer =
    await api.functional.communityPlatform.products.questions.answers.at(
      memberConnection,
      {
        productCode: productCode,
        questionId: question.id,
        answerId: answer.answerId,
      },
    );
  typia.assert(retrievedAnswer);
  // Step 8: Validate the retrieved answer contains correct information
  TestValidator.equals(
    "retrieved answer ID matches created answer",
    retrievedAnswer.answerId,
    answer.answerId,
  );
  TestValidator.equals(
    "retrieved question ID matches",
    retrievedAnswer.questionId,
    question.id,
  );
  TestValidator.equals(
    "retrieved product code matches",
    retrievedAnswer.productCode,
    productCode,
  );
  TestValidator.equals(
    "retrieved answer content matches",
    retrievedAnswer.content,
    answer.content,
  );
  // Extract member ID from the authorization response instead of headers
  TestValidator.equals(
    "retrieved answer author ID matches",
    retrievedAnswer.authorId,
    memberAuth.id,
  );
  TestValidator.predicate(
    "retrieved answer has valid creation timestamp",
    () => {
      const createdAt = new Date(retrievedAnswer.createdAt);
      return !isNaN(createdAt.getTime());
    },
  );
}
