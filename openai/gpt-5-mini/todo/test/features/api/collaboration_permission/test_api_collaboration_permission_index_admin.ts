import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppCollaborationPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppCollaborationPermission";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppCollaborationPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCollaborationPermission";

/**
 * Validate admin search and pagination for collaboration permission
 * definitions.
 *
 * Business context:
 *
 * - Administrative users may create permission codes (e.g. 'list.read',
 *   'list.write') that control collaborator capabilities. Admin UIs rely on a
 *   paginated listing endpoint to search/filter/sort permission definitions.
 *
 * Test steps:
 *
 * 1. Register a new admin via POST /auth/admin/join and validate returned
 *    authorization payload.
 * 2. Create two collaboration permission records for 'list.read' and 'list.write'
 *    with isGrantable=true.
 * 3. Search with a partial code filter ('list.') + isGrantable=true + pagination
 *    and verify the created records appear and pagination metadata exists.
 * 4. Search with exact code 'list.read' and verify single-result behavior.
 * 5. Ensure server enforces maximum pageSize by requesting pageSize=500 and
 *    asserting a validation error is returned.
 */
export async function test_api_collaboration_permission_index_admin(
  connection: api.IConnection,
) {
  // 1. Admin signup (creates an authorized admin and SDK attaches token)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "strong-password-2025", // >=8 chars
        display_name: RandomGenerator.name(),
        role: "superadmin",
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Create initial collaboration permissions: 'list.read' and 'list.write'
  const createdRead: ITodoAppCollaborationPermission =
    await api.functional.todoApp.admin.collaborationPermissions.create(
      connection,
      {
        body: {
          code: "list.read",
          description: "Allow reading lists",
          isGrantable: true,
        } satisfies ITodoAppCollaborationPermission.ICreate,
      },
    );
  typia.assert(createdRead);

  const createdWrite: ITodoAppCollaborationPermission =
    await api.functional.todoApp.admin.collaborationPermissions.create(
      connection,
      {
        body: {
          code: "list.write",
          description: "Allow modifying lists",
          isGrantable: true,
        } satisfies ITodoAppCollaborationPermission.ICreate,
      },
    );
  typia.assert(createdWrite);

  // 3. Search (partial code filter) with pagination and sorting
  const pageResult: IPageITodoAppCollaborationPermission.ISummary =
    await api.functional.todoApp.admin.collaborationPermissions.index(
      connection,
      {
        body: {
          page: 1,
          pageSize: 10,
          code: "list.", // partial match
          isGrantable: true,
          sortBy: "code",
          order: "asc",
        } satisfies ITodoAppCollaborationPermission.IRequest,
      },
    );
  typia.assert(pageResult);

  // Validate pagination metadata existence and sanity
  TestValidator.predicate(
    "pagination present and current page >= 1",
    pageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    pageResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pageResult.pagination.pages >= 0,
  );

  // Validate that created items are present in the result set by code
  TestValidator.predicate(
    "result contains list.read",
    pageResult.data.some((d) => d.code === "list.read"),
  );
  TestValidator.predicate(
    "result contains list.write",
    pageResult.data.some((d) => d.code === "list.write"),
  );

  // For each returned item, typia.assert the shape (ensures id, timestamps, etc.)
  pageResult.data.forEach((item) => typia.assert(item));

  // 4. Perform exact-filter search for 'list.read'
  const exactPage: IPageITodoAppCollaborationPermission.ISummary =
    await api.functional.todoApp.admin.collaborationPermissions.index(
      connection,
      {
        body: {
          page: 1,
          pageSize: 10,
          code: "list.read",
          isGrantable: true,
          sortBy: "code",
          order: "asc",
        } satisfies ITodoAppCollaborationPermission.IRequest,
      },
    );
  typia.assert(exactPage);

  // Expect a single item for the exact code
  TestValidator.equals(
    "exact filter returns single item",
    exactPage.data.length,
    1,
  );
  TestValidator.equals(
    "exact item code matches expected",
    exactPage.data[0].code,
    "list.read",
  );
  TestValidator.equals(
    "exact item id matches created read id",
    exactPage.data[0].id,
    createdRead.id,
  );

  // 5. Excessive pageSize should produce validation error (pageSize > 200)
  await TestValidator.error(
    "excessive pageSize should fail validation",
    async () => {
      await api.functional.todoApp.admin.collaborationPermissions.index(
        connection,
        {
          body: {
            page: 1,
            pageSize: 500, // exceed documented maximum 200
          } satisfies ITodoAppCollaborationPermission.IRequest,
        },
      );
    },
  );
}
