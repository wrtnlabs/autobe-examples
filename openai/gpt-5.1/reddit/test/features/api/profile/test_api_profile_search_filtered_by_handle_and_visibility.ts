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
 * Verify profile search filtering by handle and visibility.
 *
 * Business goal:
 *
 * - Ensure PATCH /communityPlatform/profiles honors `filter.handle` and
 *   `filter.is_profile_public` when listing profiles, while working with the
 *   pagination contract.
 *
 * Test flow:
 *
 * 1. Join as a new memberUser to establish an authenticated context.
 * 2. Create a community to satisfy community context requirements.
 * 3. Fetch an initial page of profiles without filters to obtain an existing
 *    username we can safely filter by.
 * 4. Perform a filtered search using `filter.handle` equal to that username and
 *    `filter.is_profile_public = true`.
 * 5. Validate that all returned profiles in the filtered result set match the
 *    handle and that pagination behaves consistently.
 * 6. Execute a negative search with a modified (non-existent) handle and
 *    `is_profile_public = true` to confirm that the endpoint can return an
 *    empty page when no records match.
 */
export async function test_api_profile_search_filtered_by_handle_and_visibility(
  connection: api.IConnection,
) {
  // 1. Join as a new memberUser (authentication context)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community to satisfy context
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
  typia.assert(community);

  // 3. Baseline, unfiltered profile search
  const baselineRequest = {
    page: {
      page: 0,
      limit: 10,
    },
  } satisfies ICommunityPlatformUserProfile.IRequest;

  const baselinePage: IPageICommunityPlatformUserProfile.ISummary =
    await api.functional.communityPlatform.profiles.index(connection, {
      body: baselineRequest,
    });
  typia.assert(baselinePage);

  const baselineData = baselinePage.data;

  // If there are no profiles, the test still should behave deterministically:
  // expect an empty filtered result as well and just exit early.
  if (baselineData.length === 0) {
    const emptyFilterRequest = {
      page: {
        page: 0,
        limit: 10,
      },
      filter: {
        handle: RandomGenerator.alphaNumeric(8),
        is_profile_public: true,
      },
    } satisfies ICommunityPlatformUserProfile.IRequest;

    const emptyFiltered: IPageICommunityPlatformUserProfile.ISummary =
      await api.functional.communityPlatform.profiles.index(connection, {
        body: emptyFilterRequest,
      });
    typia.assert(emptyFiltered);

    TestValidator.equals(
      "empty baseline implies empty filtered result",
      emptyFiltered.data.length,
      0,
    );
    return;
  }

  // 4. Pick a handle (use username from an existing summary)
  const seedProfile: ICommunityPlatformUserProfile.ISummary = baselineData[0];
  typia.assert(seedProfile);

  const handle: string = seedProfile.username;

  TestValidator.predicate(
    "seed profile must have non-empty username",
    handle.length > 0,
  );

  // 5. Filtered search by handle and visibility
  const filteredRequest = {
    page: {
      page: 0,
      limit: 10,
    },
    filter: {
      handle,
      is_profile_public: true,
    },
  } satisfies ICommunityPlatformUserProfile.IRequest;

  const filteredPage: IPageICommunityPlatformUserProfile.ISummary =
    await api.functional.communityPlatform.profiles.index(connection, {
      body: filteredRequest,
    });
  typia.assert(filteredPage);

  TestValidator.predicate(
    "filtered page size should not exceed baseline page size",
    filteredPage.data.length <= baselineData.length,
  );

  // 6. Validate each result matches handle and has reasonable identity fields
  for (const profile of filteredPage.data) {
    typia.assert(profile);

    TestValidator.equals(
      "profile username must match handle filter",
      profile.username,
      handle,
    );

    if (profile.displayName !== undefined) {
      TestValidator.predicate(
        "displayName, when present, should not be empty",
        profile.displayName.length === 0 ? false : true,
      );
    }
  }

  // 7. Negative search: use a non-existent handle based on the known one
  const nonExistentHandle = `${handle}_${RandomGenerator.alphaNumeric(6)}`;

  const negativeRequest = {
    page: {
      page: 0,
      limit: 10,
    },
    filter: {
      handle: nonExistentHandle,
      is_profile_public: true,
    },
  } satisfies ICommunityPlatformUserProfile.IRequest;

  const negativePage: IPageICommunityPlatformUserProfile.ISummary =
    await api.functional.communityPlatform.profiles.index(connection, {
      body: negativeRequest,
    });
  typia.assert(negativePage);

  TestValidator.equals(
    "search with non-existent handle should return empty data",
    negativePage.data.length,
    0,
  );
}
