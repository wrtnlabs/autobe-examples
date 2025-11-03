import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListShare } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListShare";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_shares_create_by_owner(
  connection: api.IConnection,
) {
  // 1) Create isolated connection objects for different authenticated actors
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Register owner
  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(ownerConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssw0rd123",
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(owner);

  // 3) Owner creates a todo list
  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    ownerConn,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        visibility: "shared-invite-only",
      } satisfies ITodoAppList.ICreate,
    },
  );
  typia.assert(list);

  // Verify ownership attribution in the created list if available
  if (list.owner) typia.assert(list.owner);
  if (list.owner)
    TestValidator.equals(
      "list.owner.id matches owner.id",
      list.owner.id,
      owner.id,
    );

  // 4) Owner creates a share for the list (happy path)
  const shareBody1 = {
    publicUrl: null,
    isPublic: true,
    visibility: "public",
    expiresAt: null,
  } satisfies ITodoAppListShare.ICreate;

  const share: ITodoAppListShare =
    await api.functional.todoApp.todoUser.lists.shares.create(ownerConn, {
      listId: list.id,
      body: shareBody1,
    });
  typia.assert(share);

  // Additional nested validation if server returned list summary inside share
  if (share.list) typia.assert(share.list);

  // Business assertions
  TestValidator.predicate("share has generated shareToken", !!share.shareToken);
  TestValidator.equals(
    "share isPublic matches request",
    share.isPublic,
    shareBody1.isPublic,
  );
  TestValidator.equals(
    "share visibility matches request",
    share.visibility,
    shareBody1.visibility,
  );
  TestValidator.equals(
    "share createdByTodouserId equals owner id",
    share.createdByTodouserId,
    owner.id,
  );
  TestValidator.predicate(
    "share has createdAt timestamp",
    typeof share.createdAt === "string",
  );
  TestValidator.predicate(
    "share has updatedAt timestamp",
    typeof share.updatedAt === "string",
  );

  // 5) Conflict: attempt to create a second active share for the same list
  // Note: Some implementations may choose idempotent behavior; this test
  // expects a business-rule error when attempting to create a second active share.
  await TestValidator.error(
    "creating duplicate active share should fail",
    async () => {
      await api.functional.todoApp.todoUser.lists.shares.create(ownerConn, {
        listId: list.id,
        body: {
          isPublic: true,
          visibility: "public",
        } satisfies ITodoAppListShare.ICreate,
      });
    },
  );

  // 6) Authorization negative cases
  // 6a) Unauthenticated caller should fail
  await TestValidator.error(
    "unauthenticated caller cannot create share",
    async () => {
      await api.functional.todoApp.todoUser.lists.shares.create(unauthConn, {
        listId: list.id,
        body: {
          isPublic: false,
          visibility: "shared",
        } satisfies ITodoAppListShare.ICreate,
      });
    },
  );

  // 6b) Non-owner authenticated caller should fail
  const other: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(otherConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AnotherP@ss1",
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(other);

  await TestValidator.error(
    "non-owner authenticated caller cannot create share",
    async () => {
      await api.functional.todoApp.todoUser.lists.shares.create(otherConn, {
        listId: list.id,
        body: {
          isPublic: false,
          visibility: "shared",
        } satisfies ITodoAppListShare.ICreate,
      });
    },
  );
}
