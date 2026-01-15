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
export async function test_api_product_question_submission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      referrer: "https://example.com",
      href: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // Step 2: Authenticate as admin
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail, // Use the stored email instead of referencing adminAccount.email
      password: "password123",
      referrer: "https://example.com",
      href: "https://example.com",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 3: Create product category
  // Generate a UUID for the category_id
  const categoryUuid = typia.random<string & tags.Format<"uuid">>();
  const category =
    await api.functional.communityPlatform.admin.categories.create(
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
  typia.assert(category);
  // Step 4: Create product using the category - use the generated UUID as category_id
  const productCode = typia.random<string>();
  const product = await api.functional.communityPlatform.member.products.create(
    adminConnection,
    {
      body: {
        code: productCode,
        title: RandomGenerator.name(),
        description: RandomGenerator.content(),
        category_id: categoryUuid, // Use generated UUID
        prices: [
          {
            product_code: productCode,
            currency_code: "USD",
            amount: 100,
            effective_from: new Date().toISOString(),
          },
        ],
      } satisfies ICommunityPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 5: Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAccount = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "memberPassword123",
      referrer: "https://example.com",
      href: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAccount);
  await authorize_member_login(memberConnection, {
    body: {
      email: memberAccount.email, // Use email from member account
      password: "memberPassword123",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 6: Submit product question
  const question =
    await api.functional.communityPlatform.member.products.questions.create(
      memberConnection,
      {
        productCode: productCode,
        body: {
          productCode: productCode, // Add required productCode property
          questionText: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformProductQuestion.ICreate,
      },
    );
  typia.assert(question);
  // Step 7: Validate question creation
  TestValidator.equals(
    "question productCode matches",
    question.productCode,
    productCode,
  );
  TestValidator.equals("question isVisible is true", question.isVisible, true);
  TestValidator.predicate(
    "question questionText is not empty",
    question.questionText.length > 0,
  );
  // Step 8: Verify invalid product code rejection
  await TestValidator.error("invalid product code should reject", async () => {
    await api.functional.communityPlatform.member.products.questions.create(
      memberConnection,
      {
        productCode: "invalid-code-123",
        body: {
          productCode: "invalid-code-123", // Add required productCode property
          questionText: "Invalid product code test",
        } satisfies ICommunityPlatformProductQuestion.ICreate,
      },
    );
  });
}
