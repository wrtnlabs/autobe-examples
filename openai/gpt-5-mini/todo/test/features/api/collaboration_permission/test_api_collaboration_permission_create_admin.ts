import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppCollaborationPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCollaborationPermission";

export async function test_api_collaboration_permission_create_admin(
  connection: api.IConnection,
) {
  /**
   * Test flow:
   *
   * 1. Register a new admin via POST /auth/admin/join
   * 2. Using the authenticated admin context, create a collaboration permission
   *    via POST /todoApp/admin/collaborationPermissions
   * 3. Validate response shape and values
   * 4. Attempt to create the same code again and expect an error (uniqueness)
   */
  // 1) Admin sign-up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "P@ssw0rd123", // satisfies min length 8
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2) Create collaboration permission payload
  const createBody = {
    code: "list.manage",
    description: "Manage lists and permissions",
    isGrantable: true,
  } satisfies ITodoAppCollaborationPermission.ICreate;

  // 3) Create permission using authenticated connection (join set Authorization)
  const permission: ITodoAppCollaborationPermission =
    await api.functional.todoApp.admin.collaborationPermissions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(permission);

  // 4) Business validations
  TestValidator.equals(
    "created permission code matches input",
    permission.code,
    createBody.code,
  );
  TestValidator.equals(
    "created permission description matches input",
    permission.description,
    createBody.description,
  );
  TestValidator.equals(
    "created permission isGrantable matches input",
    permission.isGrantable,
    createBody.isGrantable,
  );

  // ID and timestamps are guaranteed by typia.assert, but assert presence as business checks
  TestValidator.predicate(
    "created permission has id",
    permission.id !== null && permission.id !== undefined,
  );
  TestValidator.predicate(
    "created permission has createdAt",
    permission.createdAt !== null && permission.createdAt !== undefined,
  );
  TestValidator.predicate(
    "created permission has updatedAt",
    permission.updatedAt !== null && permission.updatedAt !== undefined,
  );

  // 5) Uniqueness: creating the same code again must fail (business error)
  await TestValidator.error(
    "duplicate permission code should fail",
    async () => {
      await api.functional.todoApp.admin.collaborationPermissions.create(
        connection,
        {
          body: createBody,
        },
      );
    },
  );
}
