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
 * Verify that profile search respects created_at date range filters and behaves
 * correctly for empty-result windows.
 *
 * Business goals:
 *
 * - Ensure PATCH /communityPlatform/profiles only returns profiles whose
 *   created_at timestamps fall within the requested [created_from, created_to]
 *   window when those filters are supplied.
 * - Ensure that extremely narrow or out-of-range windows yield an empty data list
 *   but still return a valid pagination envelope instead of an error.
 *
 * Scenario steps:
 *
 * 1. Join as a new memberUser (auth.memberUser.join) to establish an authenticated
 *    memberUser context and authorization token.
 * 2. Create a community via communityPlatform.memberUser.communities.create so the
 *    platform has at least one member-owned community in this session.
 * 3. Call communityPlatform.profiles.index with a broad request (no
 *    created_from/created_to, filter.is_profile_public = true, small
 *    page.limit) to obtain a baseline page of public profile summaries.
 * 4. If the baseline page has at least one profile: 4-1. Pick a summary and fetch
 *    its full profile via communityPlatform.profiles.at using summary.username
 *    as the handle. 4-2. Use that profile.created_at as both created_from and
 *    created_to to define a one-point inclusive window. 4-3. Call
 *    profiles.index again with that date range and assert that every returned
 *    summary, when resolved to a full profile via profiles.at, has created_at
 *    equal to the anchor timestamp (thus inside the range).
 * 5. Construct an intentionally empty date range (for example a short window in
 *    year 2000) and call profiles.index with that filter; assert that
 *    data.length is 0 while pagination is structurally valid and consistent
 *    with an empty dataset.
 * 6. If the baseline search from step 3 returns no profiles at all, skip the
 *    anchored-range checks from step 4 and only perform the empty-range
 *    assertions from step 5 to still validate correct empty-window behavior.
 */
export async function test_api_profile_search_filtered_by_creation_date_range(
  connection: api.IConnection,
) {
  // 1. Register a new member user to obtain an authenticated memberUser session.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<IAuthorizationToken>(authorizedMember.token);
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorizedMember);

  // 2. Create a community owned by this member user so that the
  //    session has realistic platform state.
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Perform a broad profile search for public profiles.
  const broadRequestBody = {
    page: {
      page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: 20 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    filter: {
      is_profile_public: true,
    },
  } satisfies ICommunityPlatformUserProfile.IRequest;

  const broadPage: IPageICommunityPlatformUserProfile.ISummary =
    await api.functional.communityPlatform.profiles.index(connection, {
      body: broadRequestBody,
    });
  typia.assert<IPageICommunityPlatformUserProfile.ISummary>(broadPage);

  const { pagination, data } = broadPage;
  typia.assert<IPage.IPagination>(pagination);

  // Basic sanity checks on pagination.
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );

  if (data.length > 0) {
    // 4. Use one of the existing profiles to derive a date range.
    const anchorSummary: ICommunityPlatformUserProfile.ISummary = data[0];
    typia.assert<ICommunityPlatformUserProfile.ISummary>(anchorSummary);

    // Fetch full profile by handle/username; ISummary exposes username which
    // corresponds to the public identity used for profile lookup.
    const anchorProfile: ICommunityPlatformUserProfile =
      await api.functional.communityPlatform.profiles.at(connection, {
        handle: anchorSummary.username,
      });
    typia.assert<ICommunityPlatformUserProfile>(anchorProfile);

    const anchorCreatedAt: string & tags.Format<"date-time"> =
      anchorProfile.created_at;

    // Build a request that constrains created_at to the exact anchor timestamp.
    const rangeRequestBody = {
      page: {
        page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 20 as number & tags.Type<"int32"> & tags.Minimum<0>,
      },
      filter: {
        is_profile_public: true,
        created_from: anchorCreatedAt,
        created_to: anchorCreatedAt,
      },
    } satisfies ICommunityPlatformUserProfile.IRequest;

    const rangedPage: IPageICommunityPlatformUserProfile.ISummary =
      await api.functional.communityPlatform.profiles.index(connection, {
        body: rangeRequestBody,
      });
    typia.assert<IPageICommunityPlatformUserProfile.ISummary>(rangedPage);
    typia.assert<IPage.IPagination>(rangedPage.pagination);

    // For every summary returned, fetch full profile and ensure created_at
    // falls within [created_from, created_to] (here, equal to anchorCreatedAt).
    await ArrayUtil.asyncForEach(rangedPage.data, async (summary, index) => {
      typia.assert<ICommunityPlatformUserProfile.ISummary>(summary);

      const full: ICommunityPlatformUserProfile =
        await api.functional.communityPlatform.profiles.at(connection, {
          handle: summary.username,
        });
      typia.assert<ICommunityPlatformUserProfile>(full);

      TestValidator.equals(
        `profile created_at equals anchor within requested range [${anchorCreatedAt}, ${anchorCreatedAt}] at index ${index}`,
        full.created_at,
        anchorCreatedAt,
      );
    });
  }

  // 5. Construct an intentionally empty date range.
  // Choose a distant past window (year 2000) that should not match any
  // modern profile created_at values.
  const emptyFrom: string & tags.Format<"date-time"> =
    "2000-01-01T00:00:00.000Z";
  const emptyTo: string & tags.Format<"date-time"> = "2000-01-01T00:00:01.000Z";

  const emptyRangeRequestBody = {
    page: {
      page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: 20 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    filter: {
      is_profile_public: true,
      created_from: emptyFrom,
      created_to: emptyTo,
    },
  } satisfies ICommunityPlatformUserProfile.IRequest;

  const emptyRangePage: IPageICommunityPlatformUserProfile.ISummary =
    await api.functional.communityPlatform.profiles.index(connection, {
      body: emptyRangeRequestBody,
    });
  typia.assert<IPageICommunityPlatformUserProfile.ISummary>(emptyRangePage);
  typia.assert<IPage.IPagination>(emptyRangePage.pagination);

  TestValidator.equals(
    "empty range search returns no profiles",
    emptyRangePage.data.length,
    0,
  );

  TestValidator.equals(
    "empty range pagination.records matches data length for empty result",
    emptyRangePage.pagination.records,
    emptyRangePage.data.length,
  );
}
