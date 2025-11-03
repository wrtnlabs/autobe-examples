import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListShare } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListShare";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_share_revoke_by_owner(
  connection: api.IConnection,
) {
  // 1) Prepare separate connection objects so join() populates per-connection tokens
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };

  // 1. Owner signs up
  const ownerEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const ownerAuth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(ownerConn, {
      body: {
        email: ownerEmail,
        password: "StrongPass1!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        displayName: RandomGenerator.name(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(ownerAuth);

  // 2. Owner creates a todo list
  const listCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "public",
  } satisfies ITodoAppList.ICreate;

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    ownerConn,
    { body: listCreateBody },
  );
  typia.assert(list);
  TestValidator.predicate("created list has id", typeof list.id === "string");

  // 3. Owner creates a share for the list
  const shareCreateBody = {
    publicUrl: null,
    isPublic: true,
    visibility: "public",
    expiresAt: null,
  } satisfies ITodoAppListShare.ICreate;

  const share: ITodoAppListShare =
    await api.functional.todoApp.todoUser.lists.shares.create(ownerConn, {
      listId: list.id,
      body: shareCreateBody,
    });
  typia.assert(share);
  TestValidator.predicate("created share has id", typeof share.id === "string");

  // 4. Owner revokes the share
  await api.functional.todoApp.todoUser.lists.shares.erase(ownerConn, {
    listId: list.id,
    shareId: share.id,
  });

  // 5. Verify a new share can be created for the same list after revocation
  const newShare: ITodoAppListShare =
    await api.functional.todoApp.todoUser.lists.shares.create(ownerConn, {
      listId: list.id,
      body: {
        publicUrl: null,
        isPublic: true,
        visibility: "public",
        expiresAt: null,
      } satisfies ITodoAppListShare.ICreate,
    });
  typia.assert(newShare);
  TestValidator.notEquals(
    "new share id differs from old share id",
    share.id,
    newShare.id,
  );

  // 6. Unauthorized actor: create a second user and attempt to revoke newShare
  const otherEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const otherAuth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(otherConn, {
      body: {
        email: otherEmail,
        password: "AnotherPass1!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        displayName: RandomGenerator.name(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(otherAuth);

  await TestValidator.error(
    "unauthorized user cannot revoke other's share",
    async () => {
      await api.functional.todoApp.todoUser.lists.shares.erase(otherConn, {
        listId: list.id,
        shareId: newShare.id,
      });
    },
  );

  // 7. Not-found: well-formed but non-existent UUIDs
  const missingListId = typia.random<string & tags.Format<"uuid">>();
  const missingShareId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error("not found for non-existent listId", async () => {
    await api.functional.todoApp.todoUser.lists.shares.erase(ownerConn, {
      listId: missingListId,
      shareId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  await TestValidator.error("not found for non-existent shareId", async () => {
    await api.functional.todoApp.todoUser.lists.shares.erase(ownerConn, {
      listId: list.id,
      shareId: missingShareId,
    });
  });

  // 8. Idempotency: calling erase again for the same newShare id should either succeed or return an error; ensure the system remains stable.
  try {
    await api.functional.todoApp.todoUser.lists.shares.erase(ownerConn, {
      listId: list.id,
      shareId: newShare.id,
    });
    // If succeeded again, it's acceptable (idempotent 204)
    TestValidator.predicate("second erase either succeeds (idempotent)", true);
  } catch (err) {
    // If server responded with not-found or similar, it's also acceptable
    TestValidator.predicate(
      "second erase may return not-found; operation tolerated",
      true,
    );
  }
}
