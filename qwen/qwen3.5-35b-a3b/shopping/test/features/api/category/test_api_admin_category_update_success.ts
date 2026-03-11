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

export async function test_api_admin_category_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin joins the system to get authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Step 2: Generate a category with random ID for update testing
  const originalCategory = typia.random<IEcommerceMallCategory>();
  // Step 3: Update the category with new name and description
  const newName = RandomGenerator.paragraph({ sentences: 2 });
  const newDescription = RandomGenerator.paragraph({ sentences: 1 });
  const updated = await api.functional.ecommerceMall.admin.categories.update(
    adminConnection,
    {
      categoryId: originalCategory.id,
      body: {
        name: newName,
        description: newDescription,
      },
    },
  );
  typia.assert(updated);
  // Step 4: Validate response contains updated values
  TestValidator.equals("name updated", updated.name, newName);
  TestValidator.equals(
    "description updated",
    updated.description,
    newDescription,
  );
  // Step 5: Verify parent remains unchanged
  TestValidator.equals(
    "parent unchanged",
    updated.parent,
    originalCategory.parent,
  );
  // Step 6: Verify is_leaf unchanged
  TestValidator.equals(
    "is_leaf unchanged",
    updated.is_leaf,
    originalCategory.is_leaf,
  );
  // Step 7: Verify product_count unchanged (products not moved)
  TestValidator.equals(
    "product_count unchanged",
    updated.product_count,
    originalCategory.product_count,
  );
  // Step 8: Verify subcategory_count unchanged
  TestValidator.equals(
    "subcategory_count unchanged",
    updated.subcategory_count,
    originalCategory.subcategory_count,
  );
  // Step 9: Verify id unchanged
  TestValidator.equals("id unchanged", updated.id, originalCategory.id);
  // Step 10: Verify created_at unchanged
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    originalCategory.created_at,
  );
}
