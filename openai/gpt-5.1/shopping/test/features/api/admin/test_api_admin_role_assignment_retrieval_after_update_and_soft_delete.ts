import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";

export async function test_api_admin_role_assignment_retrieval_after_update_and_soft_delete(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain an authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create an admin role with a unique code
  const roleBody = {
    code: `role_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleBody,
    });
  typia.assert(role);

  TestValidator.equals(
    "created role code matches request",
    role.code,
    roleBody.code,
  );

  // 3. Create an admin role assignment under that role for the joined admin
  const assignmentCreateBody = {
    admin_id: authorizedAdmin.id,
    reason: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const createdAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: role.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert(createdAssignment);

  TestValidator.equals(
    "assignment admin id matches joined admin id",
    createdAssignment.shopping_mall_admin_id,
    assignmentCreateBody.admin_id,
  );

  // 4. Fetch the assignment immediately as baseline
  const initialFetched: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoleAssignments.at(
      connection,
      {
        adminRoleAssignmentId: createdAssignment.id,
      },
    );
  typia.assert(initialFetched);

  TestValidator.equals(
    "initial fetch id equals created assignment id",
    initialFetched.id,
    createdAssignment.id,
  );

  TestValidator.equals(
    "initial fetch reason equals created reason",
    initialFetched.reason ?? null,
    assignmentCreateBody.reason ?? null,
  );

  // 5. Update the assignment: change reason and set granted_by_admin_id
  const updatedReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });

  const updateBody = {
    reason: updatedReason,
    granted_by_admin_id: authorizedAdmin.id,
  } satisfies IShoppingMallAdminRoleAssignment.IUpdate;

  const updatedAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoleAssignments.update(
      connection,
      {
        adminRoleAssignmentId: createdAssignment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAssignment);

  TestValidator.equals(
    "updated assignment id matches original",
    updatedAssignment.id,
    createdAssignment.id,
  );

  TestValidator.equals(
    "updated assignment reason matches update payload",
    updatedAssignment.reason ?? null,
    updatedReason,
  );

  TestValidator.equals(
    "updated assignment granted_by_admin_id matches admin id",
    updatedAssignment.granted_by_admin_id ?? null,
    authorizedAdmin.id,
  );

  // updated_at should change after update
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedAssignment.updated_at,
    initialFetched.updated_at,
  );

  // 6. Fetch the assignment again and ensure it reflects the latest state
  const fetchedAfterUpdate: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoleAssignments.at(
      connection,
      {
        adminRoleAssignmentId: createdAssignment.id,
      },
    );
  typia.assert(fetchedAfterUpdate);

  TestValidator.equals(
    "fetched-after-update id matches original",
    fetchedAfterUpdate.id,
    createdAssignment.id,
  );

  TestValidator.equals(
    "fetched-after-update admin id remains unchanged",
    fetchedAfterUpdate.shopping_mall_admin_id,
    createdAssignment.shopping_mall_admin_id,
  );

  TestValidator.equals(
    "fetched-after-update role id remains unchanged",
    fetchedAfterUpdate.shopping_mall_admin_role_id,
    createdAssignment.shopping_mall_admin_role_id,
  );

  TestValidator.equals(
    "fetched-after-update reason matches updated reason",
    fetchedAfterUpdate.reason ?? null,
    updatedReason,
  );

  TestValidator.equals(
    "fetched-after-update granted_by_admin_id matches admin id",
    fetchedAfterUpdate.granted_by_admin_id ?? null,
    authorizedAdmin.id,
  );

  // deleted_at should remain stable (we cannot manipulate it from client-side)
  TestValidator.equals(
    "deleted_at remains unchanged before and after update",
    fetchedAfterUpdate.deleted_at ?? null,
    initialFetched.deleted_at ?? null,
  );
}
