import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";

export async function test_api_admin_role_assignment_create_with_audit_metadata(
  connection: api.IConnection,
) {
  // 1. Register operator admin (first join)
  const operatorJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const operatorAuth = await api.functional.auth.admin.join(connection, {
    body: operatorJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(operatorAuth);

  const operatorId = operatorAuth.id;
  typia.assert<string & tags.Format<"uuid">>(operatorId);

  // 2. Register recipient admin (second join, becomes current authenticated admin)
  const recipientJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const recipientAuth = await api.functional.auth.admin.join(connection, {
    body: recipientJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(recipientAuth);

  const recipientId = recipientAuth.id;
  typia.assert<string & tags.Format<"uuid">>(recipientId);

  // NOTE:
  // We don't have a dedicated login endpoint in the provided SDK, and join
  // updates connection.headers.Authorization internally. After the second
  // join, the recipient admin is the authenticated actor. Therefore, all
  // subsequent role and assignment operations are performed as the recipient
  // admin. We treat this currently authenticated admin as the "granter" for
  // the purposes of granted_by_admin_id audit checks.

  // 3. Create an admin role under current admin context (recipient)
  const roleCreateBody = typia.random<IShoppingMallAdminRole.ICreate>();
  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateBody,
    });
  typia.assert<IShoppingMallAdminRole>(role);

  const adminRoleCode = role.code;
  TestValidator.predicate(
    "admin role code should be non-empty",
    () => typeof adminRoleCode === "string" && adminRoleCode.length > 0,
  );

  // 4. Create admin role assignment for the recipient admin
  const assignmentCreateBody = {
    admin_id: recipientId,
    reason: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode,
        body: assignmentCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(assignment);

  // 4-1. shopping_mall_admin_id equals recipient id
  TestValidator.equals(
    "assignment.shopping_mall_admin_id matches recipient id",
    assignment.shopping_mall_admin_id,
    recipientId,
  );

  // 4-2. granted_by_admin_id semantics
  // When non-null, granted_by_admin_id should be the id of the admin who
  // performed the assignment. Given our join sequence, the authenticated
  // admin at assignment time is the recipient admin.
  const grantedBy = assignment.granted_by_admin_id ?? null;
  if (grantedBy !== null) {
    typia.assert<string & tags.Format<"uuid">>(grantedBy);
    TestValidator.equals(
      "granted_by_admin_id matches assigning admin (current auth admin)",
      grantedBy,
      recipientId,
    );
  }

  // 4-3. created_at and updated_at are ISO strings and created_at <= updated_at
  const createdAt = assignment.created_at;
  const updatedAt = assignment.updated_at;
  typia.assert<string & tags.Format<"date-time">>(createdAt);
  typia.assert<string & tags.Format<"date-time">>(updatedAt);

  const createdDate = new Date(createdAt);
  const updatedDate = new Date(updatedAt);

  TestValidator.predicate(
    "created_at should be less than or equal to updated_at",
    () => createdDate.getTime() <= updatedDate.getTime(),
  );

  // 4-4. deleted_at must be null or undefined on a freshly created assignment
  TestValidator.predicate(
    "deleted_at should be null or undefined on new assignment",
    () => assignment.deleted_at === null || assignment.deleted_at === undefined,
  );
}
