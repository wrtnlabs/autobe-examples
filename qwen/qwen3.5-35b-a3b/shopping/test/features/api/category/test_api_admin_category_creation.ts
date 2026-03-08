import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_admin_category_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join to create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminTest@123",
      href: "https://admin.test.com/join",
      referrer: "https://admin.test.com",
    },
  });
  typia.assert(adminJoinResponse);
  // Create admin connection with token for authenticated requests
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: adminJoinResponse.token.access };
  // 2. Create top-level category
  const topLevelCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: typia.random<string & tags.MaxLength<500>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(topLevelCategory);
  // 3. Validate top-level category structure after typia.assert()
  TestValidator.equals(
    "top-level category name matches input",
    topLevelCategory.name,
    topLevelCategory.name,
  );
  TestValidator.equals(
    "top-level category is leaf",
    topLevelCategory.is_leaf,
    true,
  );
  // 4. Create subcategory with parent_category_id
  const subcategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: typia.random<string & tags.MaxLength<500>>(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_category_id: topLevelCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 5. Validate subcategory hierarchical relationship
  TestValidator.equals(
    "subcategory name matches input",
    subcategory.name,
    subcategory.name,
  );
  TestValidator.equals(
    "subcategory parent ID matches",
    subcategory.parent?.id,
    topLevelCategory.id,
  );
  TestValidator.equals(
    "subcategory parent name matches",
    subcategory.parent?.name,
    topLevelCategory.name,
  );
  TestValidator.equals("subcategory is leaf", subcategory.is_leaf, true);
}
