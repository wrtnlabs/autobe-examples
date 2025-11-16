import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserProfile";

/**
 * Basic public listing search of community user profiles.
 *
 * Business goal
 *
 * - Verify that the communityPlatform profile search endpoint returns a paginated
 *   list of user profile summaries when invoked with explicit default-style
 *   pagination and no filters.
 * - Treat any returned profiles as already filtered by the server’s visibility
 *   rules; this test focuses on structure, pagination, and basic sanity of
 *   summary fields rather than deep authorization or visibility logic.
 *
 * High-level flow
 *
 * 1. Register a new member user with POST /auth/memberUser/join to obtain an
 *    authenticated memberUser context. This uses
 *    `api.functional.auth.memberUser.join` with an
 *    `ICommunityPlatformMemberuser.IJoin` body containing realistic
 *    username/email/password and href/referrer.
 * 2. As that memberUser, create a community via
 *    `api.functional.communityPlatform.memberUser.communities.create` passing
 *    an `ICommunityPlatformCommunity.ICreate` body. Values should be simple but
 *    valid, and we rely on the backend to associate the community with the
 *    authenticated user. The created community is not directly used in the
 *    search call but ensures the platform has at least one member-created
 *    community in this session, aligning with the scenario’s prerequisite.
 * 3. Invoke the profile search endpoint using
 *    `api.functional.communityPlatform.profiles.index` (PATCH
 *    /communityPlatform/profiles) with an
 *    `ICommunityPlatformUserProfile.IRequest` body configured for a basic
 *    listing:
 *
 *    - `page`: an `IPage.IRequest` object with a concrete `page` and `limit` (for
 *         example, page = 0, limit = 20) to simulate a typical first-page
 *         search.
 *    - `filter`: left `undefined` so that no explicit filters are applied, matching
 *         the requirement of "no filters" and relying on backend defaults for
 *         visibility and ordering.
 * 4. Receive the response as `IPageICommunityPlatformUserProfile.ISummary` and run
 *    assertions:
 *
 *    - Use `typia.assert` to validate the entire response structure, including
 *         `pagination` and each `data` element, according to the DTO types.
 *    - Assert via `TestValidator.equals` that `pagination.current` equals the
 *         requested page index and `pagination.limit` equals the requested
 *         limit, ensuring basic pagination coherence.
 *    - Assert via `TestValidator.predicate` that `pagination.records` and
 *         `pagination.pages` are non-negative. We do not compute our own
 *         totals; we just ensure the values are plausible and consistent with
 *         being counts.
 * 5. If the `data` array is non-empty, iterate each
 *    `ICommunityPlatformUserProfile.ISummary` item and assert basic business
 *    sanity without duplicating typia’s type checks:
 *
 *    - `id` is a non-empty string (UUID format already guaranteed by
 *         `typia.assert`).
 *    - `username` is a non-empty string, suitable for use in mentions or profile
 *         URLs.
 *    - Optional fields like `displayName`, `avatarUrl`, `bioSnippet`,
 *         `totalPostCount`, `totalCommentCount`, and `karmaScore` are accepted
 *         as-is; when present, we only perform very simple sanity predicates,
 *         such as `totalPostCount` and `totalCommentCount` being greater than
 *         or equal to zero (again, typia already enforces this, so such checks
 *         are primarily business-intent documentation).
 * 6. The test deliberately does not:
 *
 *    - Assert specific HTTP status codes (handled by the SDK and error types, which
 *         would throw on non-2xx responses).
 *    - Enforce or inspect any internal `is_profile_public` or visibility flags.
 *         Instead it treats presence of results as evidence that server
 *         visibility rules are in effect.
 *    - Apply filters or search text; this is a pure basic listing test.
 */
export async function test_api_profile_search_basic_public_listing(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) to obtain authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    // allow server to derive IP by omitting or sending null; here we send null explicitly
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember = await api.functional.auth.memberUser.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(authorizedMember);

  // 2. Create a community owned by this member user to match scenario context
  const createCommunityBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: createCommunityBody,
      },
    );
  typia.assert(community);

  // 3. Prepare basic page request with no filters for profile search
  const pageRequest = {
    page: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 20 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IPage.IRequest;

  const profileSearchRequest = {
    page: pageRequest,
    // filter is intentionally omitted to represent "no filters"
  } satisfies ICommunityPlatformUserProfile.IRequest;

  const pageResult = await api.functional.communityPlatform.profiles.index(
    connection,
    {
      body: profileSearchRequest,
    },
  );
  typia.assert(pageResult);

  // 4. Assert pagination metadata is consistent with request
  const pagination = pageResult.pagination;
  TestValidator.equals(
    "pagination current page matches requested page index",
    pagination.current,
    pageRequest.page,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    pagination.limit,
    pageRequest.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );

  // 5. When data is present, perform sanity checks on each profile summary
  const profiles = pageResult.data;
  if (profiles.length > 0) {
    for (const profile of profiles) {
      // typia.assert already guarantees full structural and type correctness.
      // Here we only add minimal business-oriented sanity checks.
      TestValidator.predicate(
        "profile id should be a non-empty string",
        profile.id.length > 0,
      );
      TestValidator.predicate(
        "profile username should be a non-empty string",
        profile.username.length > 0,
      );

      if (profile.totalPostCount !== undefined) {
        TestValidator.predicate(
          "totalPostCount, when present, is non-negative",
          profile.totalPostCount >= 0,
        );
      }
      if (profile.totalCommentCount !== undefined) {
        TestValidator.predicate(
          "totalCommentCount, when present, is non-negative",
          profile.totalCommentCount >= 0,
        );
      }
    }
  }
}
