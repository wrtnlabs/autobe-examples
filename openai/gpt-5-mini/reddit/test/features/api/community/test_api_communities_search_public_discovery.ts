import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunity";

export async function test_api_communities_search_public_discovery(
  connection: api.IConnection,
) {
  // 1) Create a unique community member via join
  const ts = Date.now();
  const memberEmail = `test-member-${ts}@example.test`;
  const memberUsername = `testmember${ts}`;

  const auth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: "Passw0rd!",
        session_context: {
          href: "https://example.test/",
          referrer: "https://example.test/ref",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(auth);

  // 2) Create public and restricted communities
  const slugBase = `test-community-${ts}`;
  const publicSlug = `${slugBase}-public`;
  const restrictedSlug = `${slugBase}-restricted`;

  const publicCommunity: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: `Public Community ${ts}`,
          slug: publicSlug,
          description: "Public community for E2E discovery test",
          visibility: "public",
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(publicCommunity);

  const restrictedCommunity: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: `Restricted Community ${ts}`,
          slug: restrictedSlug,
          description: "Restricted community for E2E discovery test",
          visibility: "restricted",
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(restrictedCommunity);

  // 3) Authenticated search: should find public community
  const authSearchResp: IPageICommunityBbsCommunity.ISummary =
    await api.functional.communityBbs.communities.index(connection, {
      body: {
        q: publicCommunity.name,
        limit: 1,
      } satisfies ICommunityBbsCommunity.IRequest,
    });
  typia.assert(authSearchResp);

  // Ensure the response includes the public community
  TestValidator.predicate(
    "authenticated search returns the created public community",
    authSearchResp.data.some((c) => c.slug === publicSlug),
  );

  // Validate pagination metadata exists and limit is a number
  TestValidator.predicate(
    "pagination limit is a number",
    typeof authSearchResp.pagination.limit === "number",
  );

  // 4) Unauthenticated search: restricted community should be omitted
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const unauthSearchResp: IPageICommunityBbsCommunity.ISummary =
    await api.functional.communityBbs.communities.index(unauthConn, {
      body: {
        q: publicCommunity.name,
        limit: 10,
      } satisfies ICommunityBbsCommunity.IRequest,
    });
  typia.assert(unauthSearchResp);

  TestValidator.predicate(
    "unauthenticated search includes public community",
    unauthSearchResp.data.some((c) => c.slug === publicSlug),
  );

  TestValidator.predicate(
    "unauthenticated search excludes restricted community",
    !unauthSearchResp.data.some((c) => c.slug === restrictedSlug),
  );

  // 5) Validate sort modes: new and top (time_window)
  const newSortResp: IPageICommunityBbsCommunity.ISummary =
    await api.functional.communityBbs.communities.index(connection, {
      body: {
        q: slugBase,
        sort: "new",
        limit: 10,
      } satisfies ICommunityBbsCommunity.IRequest,
    });
  typia.assert(newSortResp);

  const topSortResp: IPageICommunityBbsCommunity.ISummary =
    await api.functional.communityBbs.communities.index(connection, {
      body: {
        q: slugBase,
        sort: "top",
        time_window: "week",
        limit: 10,
      } satisfies ICommunityBbsCommunity.IRequest,
    });
  typia.assert(topSortResp);

  TestValidator.predicate(
    "both sort modes returned arrays",
    Array.isArray(newSortResp.data) && Array.isArray(topSortResp.data),
  );

  // Non-strict check that the ordering or results may differ between sorts
  TestValidator.notEquals(
    "new and top sort result ordering differs (non-strict)",
    JSON.stringify(newSortResp.data.map((d) => d.id)),
    JSON.stringify(topSortResp.data.map((d) => d.id)),
  );
}
