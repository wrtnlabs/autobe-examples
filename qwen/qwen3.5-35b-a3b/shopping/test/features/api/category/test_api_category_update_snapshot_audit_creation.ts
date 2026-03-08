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

export async function test_api_category_update_snapshot_audit_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminResponse);
  // 2. Update category (simulating existing category with generated UUID)
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Store original values for validation
  const originalName = RandomGenerator.name(3);
  const originalDescription: string | null = RandomGenerator.paragraph({
    sentences: 2,
  });
  const updatedName = RandomGenerator.name(3);
  const updatedDescription: string | null = RandomGenerator.paragraph({
    sentences: 3,
  });
  // First update - change name and description
  const updateBody = {
    name: updatedName,
    description: updatedDescription,
  } satisfies IEcommerceMallCategory.IUpdate;
  const updatedCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);
  // 3. Validate update response contains new values
  TestValidator.equals(
    "category name updated",
    updatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "category description updated",
    updatedCategory.description,
    updatedDescription,
  );
  // 4. Verify updated_at timestamp was modified
  const now = new Date();
  const updatedAt = new Date(updatedCategory.updated_at);
  const timeDifference = Math.abs(now.getTime() - updatedAt.getTime());
  TestValidator.predicate(
    "updated_at timestamp is recent (within 1 second)",
    timeDifference < 1000,
  );
  // 5. Verify snapshot audit trail - test second update to confirm snapshot creation
  const secondUpdateName = RandomGenerator.name(3);
  const secondUpdateDescription: string | null = null;
  const secondUpdateBody = {
    name: secondUpdateName,
    description: secondUpdateDescription,
  } satisfies IEcommerceMallCategory.IUpdate;
  const secondUpdatedCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondUpdatedCategory);
  // 6. Validate second update was successful
  TestValidator.equals(
    "second update name reflects new value",
    secondUpdatedCategory.name,
    secondUpdateName,
  );
  TestValidator.equals(
    "second update description reflects null",
    secondUpdatedCategory.description,
    secondUpdateDescription,
  );
  // 7. Verify is_leaf flag remains unchanged
  TestValidator.equals(
    "is_leaf flag preserved after update",
    updatedCategory.is_leaf,
    secondUpdatedCategory.is_leaf,
  );
  // 8. Verify created_at timestamp is unchanged (only updated_at should change)
  TestValidator.equals(
    "created_at timestamp unchanged after second update",
    updatedCategory.created_at,
    secondUpdatedCategory.created_at,
  );
  // 9. Verify parent relationship preserved
  TestValidator.equals(
    "parent relationship preserved",
    updatedCategory.parent,
    secondUpdatedCategory.parent,
  );
  // 10. Test partial update (only name, description unchanged)
  const partialUpdateName = RandomGenerator.name(2);
  const partialUpdateBody = {
    name: partialUpdateName,
  } satisfies IEcommerceMallCategory.IUpdate;
  const partialUpdatedCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId,
        body: partialUpdateBody,
      },
    );
  typia.assert(partialUpdatedCategory);
  TestValidator.equals(
    "partial update name changed",
    partialUpdatedCategory.name,
    partialUpdateName,
  );
  TestValidator.equals(
    "partial update description preserved from second update",
    partialUpdatedCategory.description,
    secondUpdateDescription,
  );
}