import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunityMember";

export async function test_api_community_member_search_by_display_name(
  connection: api.IConnection,
) {
  // 1) Create three community members via the join endpoint: alice, bob, carol.
  const alice = await api.functional.auth.communityMember.join(connection, {
    body: {
      email: "alice@example.test",
      username: "alice",
      password: "Passw0rd!",
      profile: { display_name: "Alice Wonder" },
      session_context: {
        href: "https://example.test/signup",
        referrer: "https://example.test/",
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(alice);

  const bob = await api.functional.auth.communityMember.join(connection, {
    body: {
      email: "bob@example.test",
      username: "bob",
      password: "Passw0rd!",
      profile: { display_name: "Bob Builder" },
      session_context: {
        href: "https://example.test/signup",
        referrer: "https://example.test/",
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(bob);

  const carol = await api.functional.auth.communityMember.join(connection, {
    body: {
      email: "carol@example.test",
      username: "carol",
      password: "Passw0rd!",
      profile: { display_name: "Carol Singer" },
      session_context: {
        href: "https://example.test/signup",
        referrer: "https://example.test/",
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(carol);

  // After joins the SDK sets Authorization on connection; for a public search
  // we must use an unauthenticated copy of the connection.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Search by partial display_name using the display_name field (trigram/ILIKE on server).
  const limit = 10;
  const searchRequest = {
    display_name: "ali",
    limit,
  } satisfies ICommunityBbsCommunityMember.IRequest;

  const page: IPageICommunityBbsCommunityMember.ISummary =
    await api.functional.communityBbs.communityMembers.index(unauthConn, {
      body: searchRequest,
    });
  typia.assert(page);

  // 3) Validate that returned items include the expected member and fields are present
  TestValidator.predicate(
    "pagination.current is number",
    typeof page.pagination.current === "number",
  );
  // Allow server-side caps: ensure returned limit is not greater than requested
  TestValidator.predicate(
    "pagination.limit is <= requested limit",
    page.pagination.limit <= limit,
  );
  TestValidator.predicate(
    "pagination.records is number",
    typeof page.pagination.records === "number",
  );

  // Ensure that at least one returned summary matches the partial display name 'ali' (case-insensitive)
  const containsMatch = ArrayUtil.has(page.data, (m) => {
    return (
      typeof m.display_name === "string" &&
      m.display_name.toLowerCase().includes("ali")
    );
  });
  TestValidator.predicate(
    "search results include member with display_name containing 'ali'",
    containsMatch,
  );

  // Ensure each returned summary contains required public fields and no sensitive fields
  for (const m of page.data) {
    // typia.assert on the whole page already validated types; but assert some business fields explicitly
    TestValidator.predicate(
      "member summary has username",
      typeof m.username === "string",
    );
    TestValidator.predicate(
      "member summary has karma number",
      typeof m.karma === "number",
    );
    TestValidator.predicate(
      "member summary has created_at",
      typeof m.created_at === "string",
    );

    // Sensitive fields must not be present in public summaries. ISummary doesn't include them;
    // as an additional runtime safety check assert their serialized absence.
    const serialized = JSON.stringify(m);
    TestValidator.predicate(
      "no password_hash in summary",
      !serialized.includes("password_hash"),
    );
    TestValidator.predicate(
      "no password_reset_token_hash in summary",
      !serialized.includes("password_reset_token_hash"),
    );
  }

  // 4) Validate ordering when requesting a sort_by=karma, order=desc
  const sortedRequest = {
    display_name: undefined,
    limit: 25,
    sort_by: "karma",
    order: "desc",
  } satisfies ICommunityBbsCommunityMember.IRequest;

  const sortedPage: IPageICommunityBbsCommunityMember.ISummary =
    await api.functional.communityBbs.communityMembers.index(unauthConn, {
      body: sortedRequest,
    });
  typia.assert(sortedPage);

  // Verify non-increasing karma order
  for (let i = 0; i + 1 < sortedPage.data.length; ++i) {
    const cur = sortedPage.data[i].karma;
    const next = sortedPage.data[i + 1].karma;
    TestValidator.predicate(
      `karma at index ${i} >= karma at index ${i + 1}`,
      cur >= next,
    );
  }
}
