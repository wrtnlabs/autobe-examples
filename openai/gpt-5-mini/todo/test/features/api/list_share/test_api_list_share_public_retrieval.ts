import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListShare } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListShare";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

/**
 * Validate that a list's public share metadata can be retrieved by
 * unauthenticated callers while keeping sensitive token data hidden. Also
 * verify that expired shares are not accessible publicly.
 *
 * Steps:
 *
 * 1. Register a new todoUser (join) and obtain authentication token (SDK auto-sets
 *    it).
 * 2. Create a new todo list as that user.
 * 3. Create a public share for the list (isPublic=true, expiresAt=null).
 * 4. As an unauthenticated client, GET the share summary and verify public-safe
 *    fields and absence of shareToken.
 * 5. Create another share with an expiry in the past and assert unauthenticated
 *    GET fails.
 */
export async function test_api_list_share_public_retrieval(
  connection: api.IConnection,
) {
  // 1) Register a fresh todoUser and obtain authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const auth = await api.functional.auth.todoUser.join(connection, {
    body: {
      email: userEmail,
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies ITodoAppTodoUser.ICreate,
  });
  typia.assert(auth);

  // 2) Create a new todo list as the authenticated user
  const createListBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    visibility: "public",
  } satisfies ITodoAppList.ICreate;

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    connection,
    { body: createListBody },
  );
  typia.assert(list);

  // 3) Create a public share for the list (no expiry)
  const publicShareBody = {
    publicUrl: typia.random<string & tags.Format<"uri">>(),
    isPublic: true,
    visibility: "public",
    expiresAt: null,
  } satisfies ITodoAppListShare.ICreate;

  const share: ITodoAppListShare =
    await api.functional.todoApp.todoUser.lists.shares.create(connection, {
      listId: list.id,
      body: publicShareBody,
    });
  typia.assert(share);

  // Prepare an unauthenticated connection (do NOT mutate original connection.headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) As unauthenticated client, retrieve the public-safe share summary
  const summary: ITodoAppListShare.ISummary =
    await api.functional.todoApp.lists.shares.at(unauthConn, {
      listId: list.id,
      shareId: share.id,
    });
  typia.assert(summary);

  // Validate returned summary is public-safe and matches created data
  TestValidator.equals(
    "public share: publicUrl matches created share",
    summary.publicUrl,
    share.publicUrl,
  );
  TestValidator.equals(
    "public share: isPublic is true",
    summary.isPublic,
    true,
  );
  TestValidator.equals(
    "public share: list id matches created list",
    summary.list.id,
    list.id,
  );
  TestValidator.predicate(
    "public share: shareToken is not exposed to public callers",
    !("shareToken" in summary),
  );

  // 5) Negative case: create a share that is already expired and assert unauthenticated GET fails
  const list2Body = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 }),
    visibility: "public",
  } satisfies ITodoAppList.ICreate;

  const list2: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(connection, {
      body: list2Body,
    });
  typia.assert(list2);

  const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
  const expiredShareBody = {
    isPublic: true,
    visibility: "public",
    publicUrl: typia.random<string & tags.Format<"uri">>(),
    expiresAt: pastDate,
  } satisfies ITodoAppListShare.ICreate;

  const expiredShare: ITodoAppListShare =
    await api.functional.todoApp.todoUser.lists.shares.create(connection, {
      listId: list2.id,
      body: expiredShareBody,
    });
  typia.assert(expiredShare);

  // Expect the expired share to NOT be retrievable by unauthenticated clients
  await TestValidator.error(
    "expired share should not be retrievable by public (404)",
    async () => {
      await api.functional.todoApp.lists.shares.at(unauthConn, {
        listId: list2.id,
        shareId: expiredShare.id,
      });
    },
  );
}
