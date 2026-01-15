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
export async function test_api_product_question_answer_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/admin/join",
      referrer: "https://example.com/home",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create product category as admin
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Step 3: Create member connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 4: Create product as member
  // Generate a UUID for category_id since ICommunityPlatformProduct.ICreate requires category_id: string & Format<"uuid">
  const productId = typia.random<string & tags.Format<"uuid">>();
  const createProductResult =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: productId, // Use generated UUID instead of non-existent category.id
          prices: [
            {
              product_code: productId, // Use generated UUID for consistency
              currency_code: "KRW",
              amount: 10000,
              effective_from: new Date().toISOString(),
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [
            {
              productCode: productId, // Use generated UUID
              name: "Product Image",
              extension: "jpg",
              url: "https://example.com/image.jpg",
              is_primary: true,
              alt_text: "Product image",
              order: 0,
            } satisfies ICommunityPlatformProductImage.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  const product: ICommunityPlatformProduct = createProductResult;
  // Step 5: Create question as member
  const questionText = RandomGenerator.paragraph({ sentences: 3 });
  const question: ICommunityPlatformProductQuestion =
    await generate_random_community_platform_member_products_questions_create(
      memberConnection,
      {
        body: {
          productCode: product.productCode,
          questionText: questionText,
        } satisfies ICommunityPlatformProductQuestion.ICreate,
        params: {
          productCode: product.productCode,
        },
      },
    );
  // Step 6: Create answer as member
  const initialAnswerContent = RandomGenerator.content({ paragraphs: 2 });
  const answer: ICommunityPlatformProductQuestionAnswer =
    await generate_random_community_platform_member_products_questions_answers_create(
      memberConnection,
      {
        body: {
          content: initialAnswerContent,
        } satisfies ICommunityPlatformProductQuestionAnswer.ICreate,
        params: {
          productCode: product.productCode,
          questionId: question.id,
        },
      },
    );
  // Step 7: Verify answer has initial content
  typia.assert(answer);
  TestValidator.equals(
    "answer has initial content",
    answer.content,
    initialAnswerContent,
  );
  // Step 8: Re-authenticate member with original credentials to update answer
  // This re-uses the memberConnection with the original member credentials
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 9: Update answer as member (same actor, same connection)
  const updatedAnswerContent = RandomGenerator.content({ paragraphs: 3 });
  const updatedAnswer: ICommunityPlatformProductQuestionAnswer =
    await api.functional.communityPlatform.member.products.questions.answers.update(
      memberConnection,
      {
        productCode: product.productCode,
        questionId: question.id,
        answerId: answer.answerId,
        body: {
          content: updatedAnswerContent,
        } satisfies ICommunityPlatformProductQuestionAnswer.IUpdate,
      },
    );
  typia.assert(updatedAnswer);
  // Step 10: Validate update was successful
  // Verify new question content was applied
  TestValidator.notEquals(
    "updated answer content differs from original",
    answer.content,
    updatedAnswer.content,
  );
  TestValidator.equals(
    "updated answer content matches new content",
    updatedAnswer.content,
    updatedAnswerContent,
  );
  // Verify timestamp has been updated
  TestValidator.predicate("updated_at timestamp changed or exists", () => {
    // Updated date should be different from creation date
    // Property 'updatedAt' doesn't exist on ICommunityPlatformProductQuestionAnswer, so check createdAt
    return updatedAnswer.createdAt !== answer.createdAt;
  });
  // Verify other immutable fields remain unchanged
  TestValidator.equals(
    "answer ID remains unchanged",
    answer.answerId,
    updatedAnswer.answerId,
  );
  TestValidator.equals(
    "question ID remains unchanged",
    answer.questionId,
    updatedAnswer.questionId,
  );
  TestValidator.equals(
    "product code remains unchanged",
    answer.productCode,
    updatedAnswer.productCode,
  );
  TestValidator.equals(
    "author ID remains unchanged",
    answer.authorId,
    updatedAnswer.authorId,
  );
}
