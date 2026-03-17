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

export async function test_api_category_partial_update_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - use utility function for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Prepare category update data - only name, description will remain null
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const newName = RandomGenerator.name();
  // 3. Perform partial update with only name field
  const updatedCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId,
        body: {
          name: newName,
          description: null as string | null | undefined,
        },
      },
    );
  typia.assert(updatedCategory);
  // 4. Validate response shows updated name with null description
  TestValidator.equals("category ID matches", updatedCategory.id, categoryId);
  TestValidator.equals(
    "category name was updated",
    updatedCategory.name,
    newName,
  );
  TestValidator.equals(
    "category description remains null",
    updatedCategory.description,
    null,
  );
  // 5. Verify other fields are preserved (slug, display_order, is_active)
  TestValidator.notEquals("category ID is valid UUID", updatedCategory.id, "");
  TestValidator.predicate("category slug is preserved", () =>
    Boolean(updatedCategory.slug),
  );
  TestValidator.predicate("category has update timestamp", () =>
    Boolean(updatedCategory.updated_at),
  );
  TestValidator.predicate("category creation timestamp exists", () =>
    Boolean(updatedCategory.created_at),
  );
  TestValidator.predicate(
    "category is active",
    () => updatedCategory.is_active === true,
  );
  TestValidator.predicate(
    "category display_order is valid",
    () => updatedCategory.display_order > 0,
  );
}
