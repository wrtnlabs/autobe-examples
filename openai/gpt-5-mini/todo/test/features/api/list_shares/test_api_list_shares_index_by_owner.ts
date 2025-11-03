import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppListShare } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppListShare";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListShare } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListShare";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

/**
 * Validate that a list owner can retrieve paginated share records for their
 * list and that filtering (isPublic, expiresBefore/After) and access controls
 * work as expected.
 *
 * Steps:
 *
 * 1. Register owner (todoUser) via POST /auth/todoUser/join
 * 2. Create a todo list as the owner via POST /todoApp/todoUser/lists
 * 3. Create a share for the created list via POST
 *    /todoApp/todoUser/lists/{listId}/shares
 * 4. Call PATCH /todoApp/todoUser/lists/{listId}/shares as the owner and validate
 *    pagination container and contents
 * 5. Validate filtering by isPublic and expiry windows
 * 6. Negative checks: unauthenticated and non-owner requests must fail
 */
export async function test_api_list_shares_index_by_owner(
  connection: api.IConnection,
) {
  // 1) Owner signup
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email: ownerEmail,
        password: "Password123",
        displayName: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://referrer.example.com/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(owner);

  // 2) Create a todo list as owner
  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        visibility: "private",
      } satisfies ITodoAppList.ICreate,
    },
  );
  typia.assert(list);

  // 3) Create a share for that list
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
  const publicUrl = `https://public.example.com/share/${RandomGenerator.alphaNumeric(8)}`;
  const createdShare: ITodoAppListShare =
    await api.functional.todoApp.todoUser.lists.shares.create(connection, {
      listId: list.id,
      body: {
        publicUrl, // optional, server may normalize
        isPublic: true,
        visibility: "public",
        expiresAt,
      } satisfies ITodoAppListShare.ICreate,
    });
  typia.assert(createdShare);

  // 4) Index shares as owner (no filters) - expect the created share to appear
  const page: IPageITodoAppListShare.ISummary =
    await api.functional.todoApp.todoUser.lists.shares.index(connection, {
      listId: list.id,
      body: {} satisfies ITodoAppListShare.IRequest,
    });
  typia.assert(page);

  // The page should contain our created share summary
  const found = page.data.find((s) => s.id === createdShare.id);
  typia.assert(found!);

  TestValidator.equals(
    "share.list.id should match created list",
    found!.list.id,
    list.id,
  );
  TestValidator.equals(
    "share.list.owner.id should equal owner id",
    found!.list.owner.id,
    owner.id,
  );
  TestValidator.equals("share.isPublic should be true", found!.isPublic, true);
  TestValidator.equals(
    "share.publicUrl should match provided value",
    found!.publicUrl,
    publicUrl,
  );
  TestValidator.equals(
    "share.expiresAt should match provided value",
    found!.expiresAt,
    expiresAt,
  );

  // 5) Filtering checks
  // 5.1 isPublic = true should return the share
  const pagePublic: IPageITodoAppListShare.ISummary =
    await api.functional.todoApp.todoUser.lists.shares.index(connection, {
      listId: list.id,
      body: {
        isPublic: true,
      } satisfies ITodoAppListShare.IRequest,
    });
  typia.assert(pagePublic);
  TestValidator.predicate(
    "filter isPublic=true returns at least one item",
    pagePublic.data.some((s) => s.id === createdShare.id),
  );

  // 5.2 isPublic = false should NOT return the created public share
  const pageNotPublic: IPageITodoAppListShare.ISummary =
    await api.functional.todoApp.todoUser.lists.shares.index(connection, {
      listId: list.id,
      body: {
        isPublic: false,
      } satisfies ITodoAppListShare.IRequest,
    });
  typia.assert(pageNotPublic);
  TestValidator.predicate(
    "filter isPublic=false excludes the public share",
    !pageNotPublic.data.some((s) => s.id === createdShare.id),
  );

  // 5.3 expiresAfter: a time before now should include the share (since expiresAt is in future)
  const pageExpiresAfter: IPageITodoAppListShare.ISummary =
    await api.functional.todoApp.todoUser.lists.shares.index(connection, {
      listId: list.id,
      body: {
        expiresAfter: new Date(Date.now() - 1000).toISOString(),
      } satisfies ITodoAppListShare.IRequest,
    });
  typia.assert(pageExpiresAfter);
  TestValidator.predicate(
    "filter expiresAfter in past includes share",
    pageExpiresAfter.data.some((s) => s.id === createdShare.id),
  );

  // 5.4 expiresBefore: a time before now should exclude the future-expiring share
  const pageExpiresBefore: IPageITodoAppListShare.ISummary =
    await api.functional.todoApp.todoUser.lists.shares.index(connection, {
      listId: list.id,
      body: {
        expiresBefore: new Date(Date.now() - 1000).toISOString(),
      } satisfies ITodoAppListShare.IRequest,
    });
  typia.assert(pageExpiresBefore);
  TestValidator.predicate(
    "filter expiresBefore in past excludes future-expiring share",
    !pageExpiresBefore.data.some((s) => s.id === createdShare.id),
  );

  // 6) Negative checks
  // 6.1 Unauthenticated request should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot index shares",
    async () => {
      await api.functional.todoApp.todoUser.lists.shares.index(unauthConn, {
        listId: list.id,
        body: {} satisfies ITodoAppListShare.IRequest,
      });
    },
  );

  // 6.2 Non-owner should receive an error (403 or 401 depending on implementation)
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(otherConn, {
      body: {
        email: otherEmail,
        password: "Password123",
        displayName: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://referrer.example.com/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(otherUser);

  await TestValidator.error(
    "non-owner cannot index shares for the list",
    async () => {
      await api.functional.todoApp.todoUser.lists.shares.index(otherConn, {
        listId: list.id,
        body: {} satisfies ITodoAppListShare.IRequest,
      });
    },
  );
}
