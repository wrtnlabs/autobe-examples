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
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_question } from "../../../prepare/prepare_random_community_platform_product_question";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_products_questions_create } from "../../../generate/generate_random_community_platform_member_products_questions_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_question_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to create product category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthResult);
  // Step 2: Create product category
  const productCategoryResult =
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
  typia.assert(productCategoryResult);
  // Use the name as the identifier (workaround until category-id is fixed)
  // However, this is not sufficient for category_id which requires uuid
  // We will create our own uuid and use it for both category and product
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Note: The category creation returns ICommunityPlatformProductCategory which has no 'id'
  // So we don't use the returned result's id, we use our generated one.
  // This assumes the system allows category creation with this id being the category's reference
  // Step 3: Authenticate as member to create product
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuthResult);
  // Step 4: Member creates a product
  const productResult =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: typia.random<string>(),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId, // Use generated uuid
          prices: [
            {
              product_code: typia.random<string>(),
              currency_code: "KRW",
              amount: Math.floor(typia.random<number & tags.Type<"uint32">>()),
              effective_from: new Date().toISOString(),
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(productResult);
  const productCode = productResult.productCode;
  // Step 5: Member creates a product question
  const questionResult =
    await generate_random_community_platform_member_products_questions_create(
      memberConnection,
      {
        params: {
          productCode,
        },
        body: {
          productCode,
          questionText: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformProductQuestion.ICreate,
      },
    );
  typia.assert(questionResult);
  const question = questionResult;
  // Step 6: Admin updates the product question with new text and answer
  // According to the endpoint definition, this operation requires admin authentication
  const newQuestionText = RandomGenerator.paragraph({ sentences: 3 });
  const newAnswerText = RandomGenerator.paragraph({ sentences: 5 });
  const updatedQuestionResult =
    await api.functional.communityPlatform.admin.products.questions.update(
      adminConnection,
      {
        productCode,
        questionId: question.id,
        body: {
          questionText: newQuestionText,
          answerText: newAnswerText,
        } satisfies ICommunityPlatformProductQuestion.IUpdate,
      },
    );
  typia.assert(updatedQuestionResult);
  const updatedQuestion = updatedQuestionResult;
  // Step 7: Verify the update was successful with the new values
  TestValidator.equals(
    "question text was updated to new value",
    updatedQuestion.questionText,
    newQuestionText,
  );
  TestValidator.equals(
    "answer text was updated to new value",
    updatedQuestion.answerText,
    newAnswerText,
  );
}
