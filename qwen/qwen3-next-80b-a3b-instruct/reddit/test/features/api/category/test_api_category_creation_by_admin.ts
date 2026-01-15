import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_category_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin via join
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create first category with unique name and active status
  const categoryName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  });
  const firstCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: categoryName,
          parent_id: null,
          status: "active", // Added required status property
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  // Validate category properties
  // Confirm the created category has the name we provided
  TestValidator.equals(
    "category name matches provided value",
    firstCategory.name,
    categoryName,
  );
  // Verify parent_id is null for root category (top-level category)
  TestValidator.equals(
    "parent_id is null for root category",
    firstCategory.parentCategoryCode,
    null,
  );
  // Test business rule: category name must be unique within parent level
  // Attempt to create another category with the same name at the same level (root)
  await TestValidator.error(
    "should reject duplicate category name at same level",
    async () => {
      await generate_random_community_platform_admin_categories_create(
        adminConnection,
        {
          body: {
            name: categoryName, // Duplicate name with no parent (same level)
            parent_id: null,
            status: "active", // Added required status property
          } satisfies ICommunityPlatformProductCategory.ICreate,
        },
      );
    },
  );
}
