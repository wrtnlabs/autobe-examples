import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";

export async function test_api_admin_role_assignment_update_with_null_values(
  connection: api.IConnection,
) {
  // 1. Join acting admin (creator/grantor context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const actingAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(actingAdmin);

  // 2. Create admin role
  const roleCode: string = RandomGenerator.alphaNumeric(12);
  const roleCreateBody = {
    code: roleCode,
    name: `Role-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateBody,
    });
  typia.assert<IShoppingMallAdminRole>(role);

  TestValidator.equals(
    "created role code should match requested code",
    role.code,
    roleCode,
  );

  // 3. Join a target admin who will receive the role assignment
  const targetAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const targetAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: targetAdminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(targetAdmin);

  // 4. Create an assignment with non-null reason (granted_by_admin_id will be set later via update)
  const initialReason: string = RandomGenerator.paragraph({ sentences: 3 });

  const assignmentCreateBody = {
    admin_id: targetAdmin.id,
    reason: initialReason,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const originalAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: role.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(originalAssignment);

  TestValidator.equals(
    "assignment admin id should match target admin",
    originalAssignment.shopping_mall_admin_id,
    targetAdmin.id,
  );
  TestValidator.predicate(
    "assignment role id should be a non-empty string",
    () =>
      typeof originalAssignment.shopping_mall_admin_role_id === "string" &&
      originalAssignment.shopping_mall_admin_role_id.length > 0,
  );
  TestValidator.equals(
    "initial reason should match",
    originalAssignment.reason,
    initialReason,
  );

  const originalUpdatedAt: string = originalAssignment.updated_at;
  const originalCreatedAt: string = originalAssignment.created_at;

  // 5. First update: set reason to null, omit granted_by_admin_id
  const clearReasonBody = {
    reason: null,
  } satisfies IShoppingMallAdminRoleAssignment.IUpdate;

  const afterReasonCleared: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoleAssignments.update(
      connection,
      {
        adminRoleAssignmentId: originalAssignment.id,
        body: clearReasonBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(afterReasonCleared);

  TestValidator.equals(
    "id should remain unchanged after clearing reason",
    afterReasonCleared.id,
    originalAssignment.id,
  );
  TestValidator.equals(
    "admin id should remain unchanged after clearing reason",
    afterReasonCleared.shopping_mall_admin_id,
    originalAssignment.shopping_mall_admin_id,
  );
  TestValidator.equals(
    "role id should remain unchanged after clearing reason",
    afterReasonCleared.shopping_mall_admin_role_id,
    originalAssignment.shopping_mall_admin_role_id,
  );
  TestValidator.equals(
    "reason should now be null after update",
    afterReasonCleared.reason,
    null,
  );
  TestValidator.equals(
    "granted_by_admin_id should be preserved when omitted from update body",
    afterReasonCleared.granted_by_admin_id,
    originalAssignment.granted_by_admin_id ?? null,
  );
  TestValidator.predicate(
    "updated_at should move forward after clearing reason",
    () => afterReasonCleared.updated_at > originalUpdatedAt,
  );
  TestValidator.equals(
    "created_at should remain unchanged after clearing reason",
    afterReasonCleared.created_at,
    originalCreatedAt,
  );

  // 6. Second phase: explicitly set granted_by_admin_id to a known non-null value
  const grantorAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const grantorAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: grantorAdminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(grantorAdmin);

  const setGrantorBody = {
    granted_by_admin_id: grantorAdmin.id,
  } satisfies IShoppingMallAdminRoleAssignment.IUpdate;

  const afterGrantorSet: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoleAssignments.update(
      connection,
      {
        adminRoleAssignmentId: originalAssignment.id,
        body: setGrantorBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(afterGrantorSet);

  TestValidator.equals(
    "grantor id should be updated to grantorAdmin.id",
    afterGrantorSet.granted_by_admin_id,
    grantorAdmin.id,
  );
  TestValidator.equals(
    "reason should remain null when not provided in update",
    afterGrantorSet.reason,
    afterReasonCleared.reason,
  );
  TestValidator.equals(
    "created_at should remain unchanged after setting grantor",
    afterGrantorSet.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should move forward after setting grantor",
    () => afterGrantorSet.updated_at > afterReasonCleared.updated_at,
  );

  // 7. Third phase: set granted_by_admin_id to null while leaving reason unchanged (null)
  const clearGrantorBody = {
    granted_by_admin_id: null,
  } satisfies IShoppingMallAdminRoleAssignment.IUpdate;

  const finalAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoleAssignments.update(
      connection,
      {
        adminRoleAssignmentId: originalAssignment.id,
        body: clearGrantorBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(finalAssignment);

  // 8. Assertions on final state
  TestValidator.equals(
    "final id should match original",
    finalAssignment.id,
    originalAssignment.id,
  );
  TestValidator.equals(
    "final admin id should match original",
    finalAssignment.shopping_mall_admin_id,
    originalAssignment.shopping_mall_admin_id,
  );
  TestValidator.equals(
    "final role id should match original",
    finalAssignment.shopping_mall_admin_role_id,
    originalAssignment.shopping_mall_admin_role_id,
  );
  TestValidator.equals(
    "final reason should remain null",
    finalAssignment.reason,
    null,
  );
  TestValidator.equals(
    "final granted_by_admin_id should be null after clearing",
    finalAssignment.granted_by_admin_id,
    null,
  );
  TestValidator.equals(
    "final created_at should still match original",
    finalAssignment.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "final updated_at should move forward compared to previous state",
    () => finalAssignment.updated_at > afterGrantorSet.updated_at,
  );
}
