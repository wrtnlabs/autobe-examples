import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalUser";

export async function test_api_user_index_public_search(
  connection: api.IConnection,
) {
  // 1) Seed multiple member accounts via POST /auth/member/join
  const createdMembers = await ArrayUtil.asyncRepeat(4, async (index) => {
    const username = RandomGenerator.alphaNumeric(8);
    const display_name = RandomGenerator.name();
    const email = `${username}@example.com`;
    const body = {
      username,
      email,
      password: "Password123!",
      display_name,
    } satisfies ICommunityPortalMember.ICreate;

    const member: ICommunityPortalMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body,
      });
    typia.assert(member);
    return member;
  });

  // 2) Deterministic search by exact username to ensure seeded user is discoverable
  const targetUsername = createdMembers[0].username!;
  const exactSearchBody = {
    username: targetUsername,
    page: 1,
    limit: 5,
    sort_by: "created_at",
    order: "desc",
  } satisfies ICommunityPortalUser.IRequest;

  const exactPage: IPageICommunityPortalUser.ISummary =
    await api.functional.communityPortal.users.index(connection, {
      body: exactSearchBody,
    });
  typia.assert(exactPage);

  TestValidator.equals(
    "exact search pagination limit matches request",
    exactPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "exact search returns at least one item",
    exactPage.data.length >= 1,
  );
  TestValidator.predicate(
    "exact search contains the target username",
    exactPage.data.some((u) => u.username === targetUsername),
  );

  // 3) Partial search + pagination & ordering check
  const partial = targetUsername.slice(0, 4);
  const limit = 2;
  const searchBody = {
    q: partial,
    page: 1,
    limit,
    sort_by: "created_at",
    order: "desc",
  } satisfies ICommunityPortalUser.IRequest;

  const page: IPageICommunityPortalUser.ISummary =
    await api.functional.communityPortal.users.index(connection, {
      body: searchBody,
    });
  typia.assert(page);

  TestValidator.equals(
    "search pagination limit matches request",
    page.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "returned count is <= limit",
    page.data.length <= limit,
  );
  TestValidator.predicate(
    "each returned item has id and username",
    page.data.every(
      (u) => typeof u.id === "string" && typeof u.username === "string",
    ),
  );

  // If sort_by created_at was requested, check ordering (desc)
  if (page.data.length > 1) {
    for (let i = 1; i < page.data.length; ++i) {
      TestValidator.predicate(
        `created_at desc ordering for index ${i - 1} and ${i}`,
        page.data[i - 1].created_at >= page.data[i].created_at,
      );
    }
  }

  // 4) Empty search should return empty data array and valid pagination meta
  const emptySearchBody = {
    q: RandomGenerator.alphaNumeric(20),
    page: 1,
    limit: 5,
  } satisfies ICommunityPortalUser.IRequest;

  const emptyPage: IPageICommunityPortalUser.ISummary =
    await api.functional.communityPortal.users.index(connection, {
      body: emptySearchBody,
    });
  typia.assert(emptyPage);

  TestValidator.equals(
    "empty search pagination limit matches request",
    emptyPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "empty search pagination current exists",
    typeof emptyPage.pagination.current === "number",
  );
  TestValidator.equals(
    "empty search returns empty data",
    emptyPage.data.length,
    0,
  );
}
