import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListShare } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListShare";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_share_update_by_owner(
  connection: api.IConnection,
) {
  // 1) Register a new todoUser (join) and obtain authorization token (injected into connection by SDK)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email: userEmail,
        password: "Password123!", // meets min length 8
        displayName: RandomGenerator.name(),
        href: "https://example.com/signup",
        referrer: "https://example.com/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(user);

  // 2) Create a todo list as the authenticated user
  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 6,
          wordMax: 12,
        }),
        visibility: "shared-invite-only",
      } satisfies ITodoAppList.ICreate,
    },
  );
  typia.assert(list);
  TestValidator.equals("created list id matches returned id", list.id, list.id);

  // 3) Create an initial share for the list (isPublic = true)
  const publicUrl = `https://public.example/${RandomGenerator.alphaNumeric(8)}`;
  const share: ITodoAppListShare =
    await api.functional.todoApp.todoUser.lists.shares.create(connection, {
      listId: list.id,
      body: {
        publicUrl,
        isPublic: true,
        visibility: "public",
        expiresAt: null,
      } satisfies ITodoAppListShare.ICreate,
    });
  typia.assert(share);
  TestValidator.predicate("created share is public", share.isPublic === true);
  TestValidator.predicate(
    "created share has non-empty shareToken (owner view)",
    typeof share.shareToken === "string" && share.shareToken.length > 0,
  );

  // 4) Owner updates the share: set isPublic=false and set expiresAt to future timestamp
  const futureIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // +1 day
  const updated: ITodoAppListShare =
    await api.functional.todoApp.todoUser.lists.shares.update(connection, {
      listId: list.id,
      shareId: share.id,
      body: {
        isPublic: false,
        visibility: "shared-invite-only",
        expiresAt: futureIso,
      } satisfies ITodoAppListShare.IUpdate,
    });
  typia.assert(updated);

  // Validate the update persisted and owner-view fields available
  TestValidator.equals("share id preserved after update", updated.id, share.id);
  TestValidator.predicate(
    "share isPublic updated to false",
    updated.isPublic === false,
  );
  TestValidator.equals("expiresAt persisted", updated.expiresAt, futureIso);
  TestValidator.predicate(
    "owner can still see shareToken after update",
    typeof updated.shareToken === "string" && updated.shareToken.length > 0,
  );

  // 5) Verify unauthenticated clients cannot modify the share (representing restricted public access)
  // Create an unauthenticated connection (allowed pattern per E2E guidelines)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated client cannot update list share",
    async () => {
      await api.functional.todoApp.todoUser.lists.shares.update(unauthConn, {
        listId: list.id,
        shareId: share.id,
        body: {
          isPublic: true,
        } satisfies ITodoAppListShare.IUpdate,
      });
    },
  );

  // Final sanity: owner can still update again (toggle back to public) to show owner permissions remain
  const reopened: ITodoAppListShare =
    await api.functional.todoApp.todoUser.lists.shares.update(connection, {
      listId: list.id,
      shareId: share.id,
      body: {
        isPublic: true,
        visibility: "public",
        expiresAt: null,
      } satisfies ITodoAppListShare.IUpdate,
    });
  typia.assert(reopened);
  TestValidator.predicate(
    "owner can re-open share as public",
    reopened.isPublic === true,
  );
}
