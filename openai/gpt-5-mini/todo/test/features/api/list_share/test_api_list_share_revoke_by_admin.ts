import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListShare } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListShare";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_share_revoke_by_admin(
  connection: api.IConnection,
) {
  // 1) Prepare separate connection contexts to avoid touching connection.headers
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const nonAdminConn: api.IConnection = { ...connection, headers: {} };
  const adminConn: api.IConnection = { ...connection, headers: {} };

  // 2) Owner: sign up (join) and assert authorized response
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerAuth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(ownerConn, {
      body: {
        email: ownerEmail,
        password: "P@ssw0rd123",
        href: "https://example.com/app/signup",
        referrer: "https://example.com/",
        displayName: RandomGenerator.name(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(ownerAuth);

  // 3) Owner: create a todo list
  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    ownerConn,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        visibility: "public",
      } satisfies ITodoAppList.ICreate,
    },
  );
  typia.assert(list);

  // 4) Owner: create a share for the list
  const share: ITodoAppListShare =
    await api.functional.todoApp.todoUser.lists.shares.create(ownerConn, {
      listId: list.id,
      body: {
        publicUrl: null,
        isPublic: true,
        visibility: "public",
        expiresAt: null,
      } satisfies ITodoAppListShare.ICreate,
    });
  typia.assert(share);

  // 5) Negative: unauthorized actor (regular todoUser) tries to revoke -> should throw
  const nonAdminEmail = typia.random<string & tags.Format<"email">>();
  const nonAdminAuth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(nonAdminConn, {
      body: {
        email: nonAdminEmail,
        password: "P@ssw0rd123",
        href: "https://example.com/app/signup",
        referrer: "https://example.com/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(nonAdminAuth);

  await TestValidator.error(
    "unauthorized actor cannot revoke share",
    async () => {
      await api.functional.todoApp.admin.lists.shares.erase(nonAdminConn, {
        listId: list.id,
        shareId: share.id,
      });
    },
  );

  // 6) Admin: create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(adminConn, {
      body: {
        email: adminEmail,
        password: "AdminP@ssw0rd1",
        href: "https://example.com/admin/signup",
        referrer: "https://example.com/",
        role: "moderator",
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 7) Not found: attempt to revoke a random non-existent shareId
  await TestValidator.error("non-existent shareId returns error", async () => {
    await api.functional.todoApp.admin.lists.shares.erase(adminConn, {
      listId: list.id,
      shareId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 8) Happy path: admin revokes the actual share created earlier
  // This should succeed (no error). The function returns void on success.
  await api.functional.todoApp.admin.lists.shares.erase(adminConn, {
    listId: list.id,
    shareId: share.id,
  });

  // 9) Verify idempotency / already-deleted behavior: second revoke should fail or be handled.
  await TestValidator.error(
    "revoking already-deleted share should error or be not-found",
    async () => {
      await api.functional.todoApp.admin.lists.shares.erase(adminConn, {
        listId: list.id,
        shareId: share.id,
      });
    },
  );
}
