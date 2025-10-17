import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussUserSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussUserSortBy";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussUser";

/**
 * Followees search: filtering, pagination, sorting, public-read, and
 * active-only validation.
 *
 * This test validates advanced listing of followees for a user:
 *
 * 1. Setup
 *
 *    - Create a viewer (follower) account.
 *    - Create multiple followee accounts with distinct display names ("Alice Macro",
 *         "Bob Labor", "Cara Macro").
 *    - Establish follow edges from the viewer to each followee.
 * 2. Execute target
 *
 *    - PATCH /econDiscuss/users/{userId}/following with body containing
 *         page/pageSize, q filter ("Macro"), and sortBy/order
 *         (created_at/desc).
 * 3. Validations
 *
 *    - Type correctness of responses.
 *    - Page size enforcement and that all returned items match the query.
 *    - Stable ordering on repeated identical requests.
 *    - Public-read behavior: identical results without Authorization header.
 *    - Out-of-range page returns empty list.
 *    - After unfollowing one matched followee, they are no longer returned
 *         (active-only).
 */
export async function test_api_following_search_pagination_sorting(
  connection: api.IConnection,
) {
  // --- 1) Create the viewer (follower) ---
  const viewerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const viewerPassword: string = RandomGenerator.alphabets(12);
  const viewerJoin: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: viewerEmail,
        password: viewerPassword,
        display_name: `Viewer ${RandomGenerator.paragraph({ sentences: 1 })}`,
        timezone: "Asia/Seoul",
        locale: "en-US",
      } satisfies IEconDiscussMember.ICreate,
    });
  typia.assert(viewerJoin);
  const viewerId = viewerJoin.id; // will be used as {userId} for search

  // --- 2) Create followees on an isolated connection so we don't switch the viewer token ---
  const altConn: api.IConnection = { ...connection, headers: {} };

  const mkMember = async (display: string) => {
    const auth: IEconDiscussMember.IAuthorized =
      await api.functional.auth.member.join(altConn, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphabets(12),
          display_name: display,
          timezone: "Asia/Seoul",
          locale: "en-US",
        } satisfies IEconDiscussMember.ICreate,
      });
    typia.assert(auth);
    return auth.id;
  };

  const aliceMacroId = await mkMember("Alice Macro");
  const bobLaborId = await mkMember("Bob Labor");
  const caraMacroId = await mkMember("Cara Macro");

  // --- 3) Create follow edges from viewer to each followee ---
  await api.functional.econDiscuss.member.users.follow.create(connection, {
    userId: aliceMacroId,
  });
  await api.functional.econDiscuss.member.users.follow.create(connection, {
    userId: bobLaborId,
  });
  await api.functional.econDiscuss.member.users.follow.create(connection, {
    userId: caraMacroId,
  });

  // --- 4) Execute target search with q="Macro" enforcing pagination (pageSize=1) and sort order ---
  const searchBodyPage1 = {
    page: 1,
    pageSize: 1,
    q: "Macro",
    sortBy: "created_at",
    order: "desc",
  } satisfies IEconDiscussUser.IRequest;

  const page1 = await api.functional.econDiscuss.users.following.search(
    connection,
    {
      userId: viewerId,
      body: searchBodyPage1,
    },
  );
  typia.assert(page1);

  // page size enforcement
  TestValidator.predicate(
    "page1 has at most 1 record",
    page1.data.length <= searchBodyPage1.pageSize,
  );
  // query filter enforcement
  const allPage1Macro = page1.data.every((u) =>
    u.displayName.includes("Macro"),
  );
  TestValidator.predicate(
    "page1 data displayName contains 'Macro'",
    allPage1Macro,
  );

  // Stable ordering check by re-running identical request
  const page1Again = await api.functional.econDiscuss.users.following.search(
    connection,
    {
      userId: viewerId,
      body: searchBodyPage1,
    },
  );
  typia.assert(page1Again);
  const firstId1 = page1.data[0]?.id;
  const firstId1Again = page1Again.data[0]?.id;
  TestValidator.equals(
    "stable first item for identical request",
    firstId1,
    firstId1Again,
  );

  // --- 5) Fetch page 2 and ensure items are from Macro followees set ---
  const searchBodyPage2 = {
    ...searchBodyPage1,
    page: 2,
  } satisfies IEconDiscussUser.IRequest;
  const page2 = await api.functional.econDiscuss.users.following.search(
    connection,
    { userId: viewerId, body: searchBodyPage2 },
  );
  typia.assert(page2);

  // if page2 has data, its first id should be different from page1's first id
  if (page2.data.length > 0 && firstId1 !== undefined) {
    TestValidator.notEquals(
      "page2 first item differs from page1 first item",
      page2.data[0].id,
      firstId1,
    );
  }

  // Validate that all fetched ids belong to the Macro followees set
  const macroSet = new Set<string>([aliceMacroId, caraMacroId]);
  const allFromMacroSet = [...page1.data, ...page2.data].every((u) =>
    macroSet.has(u.id),
  );
  TestValidator.predicate(
    "returned ids belong to the Macro followees set",
    allFromMacroSet,
  );

  // --- 6) Public-read behavior: same request without Authorization header ---
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const page1Public = await api.functional.econDiscuss.users.following.search(
    publicConn,
    { userId: viewerId, body: searchBodyPage1 },
  );
  typia.assert(page1Public);
  TestValidator.equals(
    "public vs authenticated page1 data equality",
    page1.data,
    page1Public.data,
  );

  // --- 7) Out-of-range page -> expect empty data array ---
  const searchBodyBeyond = {
    ...searchBodyPage1,
    page: (page1.pagination.pages + 1) as number,
  } satisfies IEconDiscussUser.IRequest;
  const pageBeyond = await api.functional.econDiscuss.users.following.search(
    connection,
    { userId: viewerId, body: searchBodyBeyond },
  );
  typia.assert(pageBeyond);
  TestValidator.equals(
    "out-of-range page returns empty data",
    pageBeyond.data.length,
    0,
  );

  // --- 8) Unfollow one Macro followee and ensure active-only constraint ---
  await api.functional.econDiscuss.member.users.follow.erase(connection, {
    userId: aliceMacroId,
  });
  const afterUnfollow = await api.functional.econDiscuss.users.following.search(
    connection,
    { userId: viewerId, body: searchBodyPage1 },
  );
  typia.assert(afterUnfollow);
  const noneIsAlice = afterUnfollow.data.every((u) => u.id !== aliceMacroId);
  TestValidator.predicate(
    "after unfollow, 'Alice Macro' is not listed",
    noneIsAlice,
  );
}
