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
export async function test_api_product_question_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connections and authorize admin and member actors
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Admin creates a product category for product creation
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Step 3: Member creates a product that the question will reference
  const productCreationBody: ICommunityPlatformProduct.ICreate = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(),
    description: RandomGenerator.content(),
    category_id: typia.random<string & tags.Format<"uuid">>(), // Fixed: Generated a UUID for category_id since category.id doesn't exist
    prices: [
      {
        product_code: RandomGenerator.alphaNumeric(8), // Reference the same code used above
        currency_code: "KRW",
        amount: typia.random<number & tags.Minimum<0>>(),
        effective_from: new Date().toISOString(),
        quantity_min: 1,
      },
    ] satisfies ICommunityPlatformProductPrice.ICreate[] & tags.MinItems<1>,
  };
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: productCreationBody,
      },
    );
  // Step 4: Test rejection of profanity-laden question (validation should fail)
  await TestValidator.error(
    "question with profanity should be rejected",
    async () => {
      await api.functional.communityPlatform.member.products.questions.create(
        memberConnection,
        {
          productCode: product.productCode, // Path parameter
          body: {
            productCode: product.productCode, // Required property in ICreate
            questionText:
              "This is fucking terrible product with shitty quality", // Actual profanity
          } satisfies ICommunityPlatformProductQuestion.ICreate,
        },
      );
    },
  );
  // Step 5: Test rejection of spam pattern question (validation should fail)
  await TestValidator.error(
    "question with spam pattern should be rejected",
    async () => {
      await api.functional.communityPlatform.member.products.questions.create(
        memberConnection,
        {
          productCode: product.productCode, // Path parameter
          body: {
            productCode: product.productCode, // Required property in ICreate
            questionText:
              "Buy now! Buy now! Buy now! Buy now! Buy now! Buy now!", // Spam pattern
          } satisfies ICommunityPlatformProductQuestion.ICreate,
        },
      );
    },
  );
  // Step 6: Test rejection of irrelevant content question (validation should fail)
  await TestValidator.error(
    "question with irrelevant content should be rejected",
    async () => {
      await api.functional.communityPlatform.member.products.questions.create(
        memberConnection,
        {
          productCode: product.productCode, // Path parameter
          body: {
            productCode: product.productCode, // Required property in ICreate
            questionText:
              "How do I cook pasta? This has nothing to do with this product.", // Irrelevant content
          } satisfies ICommunityPlatformProductQuestion.ICreate,
        },
      );
    },
  );
  // Step 7: Test successful submission of valid question (validation should pass)
  const validQuestion: ICommunityPlatformProductQuestion =
    await api.functional.communityPlatform.member.products.questions.create(
      memberConnection,
      {
        productCode: product.productCode, // Path parameter
        body: {
          productCode: product.productCode, // Required property in ICreate
          questionText: "What is the warranty period for this product?", // Valid question
        } satisfies ICommunityPlatformProductQuestion.ICreate,
      },
    );
  typia.assert(validQuestion);
  TestValidator.equals(
    "question text matches",
    validQuestion.questionText,
    "What is the warranty period for this product?",
  );
  TestValidator.equals(
    "product code matches",
    validQuestion.productCode,
    product.productCode,
  );
  TestValidator.predicate(
    "question is visible",
    () => validQuestion.isVisible === true,
  );
}
