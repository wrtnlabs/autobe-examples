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

export async function test_api_category_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Generate a category to update (simulated with random data)
  const category = typia.random<IEcommerceMallCategory>();
  typia.assert(category);
  // 3. Store original values for comparison
  const originalName = category.name;
  const originalDescription = category.description;
  const originalSlug = category.slug;
  const originalDisplayOrder = category.display_order;
  const originalIsActive = category.is_active;
  const originalParent = category.parent;
  // 4. Generate update values (different from original)
  const newName = RandomGenerator.paragraph({ sentences: 3 });
  const newDescription = RandomGenerator.paragraph({ sentences: 2 });
  // Ensure we're actually updating something
  const updateName = newName === originalName ? newName + " UPDATED" : newName;
  const updateDescription =
    newDescription === originalDescription
      ? newDescription + " UPDATED"
      : newDescription;
  // 5. Update the category
  const updatedCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          name: updateName,
          description: updateDescription,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 6. Verify update
  TestValidator.equals("name updated", updatedCategory.name, updateName);
  TestValidator.equals(
    "description updated",
    updatedCategory.description,
    updateDescription,
  );
  // 7. Verify unchanged fields remain intact
  TestValidator.equals("slug unchanged", updatedCategory.slug, originalSlug);
  TestValidator.equals(
    "display_order unchanged",
    updatedCategory.display_order,
    originalDisplayOrder,
  );
  TestValidator.equals(
    "is_active unchanged",
    updatedCategory.is_active,
    originalIsActive,
  );
  TestValidator.equals(
    "parent unchanged",
    updatedCategory.parent,
    originalParent,
  );
  // 8. Verify timestamps are preserved (updated_at may change, but created_at should remain)
  TestValidator.equals(
    "created_at preserved",
    updatedCategory.created_at,
    category.created_at,
  );
  // Note: Snapshot verification would require calling /ecommerceMall/admin/categories/{id}/snapshots
  // which is not available in the current API template. The update operation creates snapshots
  // server-side, but validation of the snapshot record requires the snapshot retrieval endpoint.
}
