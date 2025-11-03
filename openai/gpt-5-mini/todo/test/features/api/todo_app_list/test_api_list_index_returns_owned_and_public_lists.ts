import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppList";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListShare } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListShare";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

/**
 * Validate creation of owned lists and creation of a public share for a public
 * list.
 *
 * Business context:
 *
 * - A todoUser can create lists with different visibility settings ('private' or
 *   'public').
 * - Owners may create a public share for a list so that it becomes publicly
 *   exposed.
 *
 * Steps:
 *
 * 1. Register a new todoUser (join) and capture the authorized user and token.
 * 2. Create three lists owned by that user: two private, one public.
 * 3. Create a public share for the public list.
 * 4. Assert all responses' shapes with typia.assert and validate business
 *    properties (titles, visibilities, owner linkage, share.isPublic &
 *    visibility).
 */
export async function test_api_list_index_returns_owned_and_public_lists(
  connection: api.IConnection,
) {
  // 1) Register a new todoUser
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Ensure we have an auth token injected by SDK
  TestValidator.predicate(
    "join returns non-empty access token",
    !!authorized.token?.access,
  );

  // 2) Create three lists: two private, one public
  const privateTitleA = "Private Notes";
  const publicTitle = "Public Recipes";
  const privateTitleB = "Work Board";

  const createBodyA = {
    title: privateTitleA,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: "private",
  } satisfies ITodoAppList.ICreate;

  const createBodyB = {
    title: publicTitle,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
  } satisfies ITodoAppList.ICreate;

  const createBodyC = {
    title: privateTitleB,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "private",
  } satisfies ITodoAppList.ICreate;

  const listA: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(connection, {
      body: createBodyA,
    });
  typia.assert(listA);

  const listB: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(connection, {
      body: createBodyB,
    });
  typia.assert(listB);

  const listC: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(connection, {
      body: createBodyC,
    });
  typia.assert(listC);

  // Business assertions: titles and visibilities and owner linkage
  TestValidator.equals("list A title matches", listA.title, privateTitleA);
  TestValidator.equals(
    "list A visibility is private",
    listA.visibility,
    "private",
  );
  TestValidator.equals("list B title matches", listB.title, publicTitle);
  TestValidator.equals(
    "list B visibility is public",
    listB.visibility,
    "public",
  );
  TestValidator.equals("list C title matches", listC.title, privateTitleB);
  TestValidator.equals(
    "list C visibility is private",
    listC.visibility,
    "private",
  );

  TestValidator.equals(
    "owner of lists matches joined user",
    listA.owner.id,
    authorized.id,
  );
  TestValidator.equals(
    "owner of public list matches joined user",
    listB.owner.id,
    authorized.id,
  );

  // 3) Create a public share for the public list
  const shareBody = {
    publicUrl: null,
    isPublic: true,
    visibility: "public",
    expiresAt: null,
  } satisfies ITodoAppListShare.ICreate;

  const share: ITodoAppListShare =
    await api.functional.todoApp.todoUser.lists.shares.create(connection, {
      listId: listB.id,
      body: shareBody,
    });
  typia.assert(share);

  // Verify share properties
  TestValidator.predicate(
    "share has id",
    typeof share.id === "string" && share.id.length > 0,
  );
  TestValidator.equals("share is public", share.isPublic, true);
  TestValidator.equals(
    "share visibility is public",
    share.visibility,
    "public",
  );
  TestValidator.equals(
    "share.todoAppListId matches public list id",
    share.todoAppListId,
    listB.id,
  );

  // 4) Additional business sanity checks
  TestValidator.predicate(
    "created lists contain expected titles",
    [listA.title, listB.title, listC.title].includes(privateTitleA) &&
      [listA.title, listB.title, listC.title].includes(publicTitle) &&
      [listA.title, listB.title, listC.title].includes(privateTitleB),
  );

  // Note: The original scenario requested calling PATCH /todoApp/todoUser/lists index
  // to retrieve visible lists. That endpoint (index) was not available in the
  // provided SDK functions. This test therefore verifies creation and share
  // metadata with the available APIs only.
}
