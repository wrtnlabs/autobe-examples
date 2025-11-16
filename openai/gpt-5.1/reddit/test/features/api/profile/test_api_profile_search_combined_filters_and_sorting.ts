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

export async function test_api_profile_search_combined_filters_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register a new member user to ensure there is at least one
  // memberUser account and associated profile in the system.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/referrer",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a community as a prerequisite business condition.
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 3. Prepare a profile search request with combined filters and
  // non-default pagination limit. As the schema does not define sort
  // fields in IPage.IRequest, we only exercise page & limit.
  const pageRequest = {
    page: 0,
    limit: 5,
  } satisfies IPage.IRequest;

  // Choose a displayName token that is plausible: use part of the
  // username we just registered so that, depending on seeding rules,
  // it might match the associated profile summary.
  const displayNameToken = authorized.username.substring(0, 2);

  const profileSearchBody = {
    page: pageRequest,
    filter: {
      displayName: displayNameToken,
      is_profile_public: true,
    },
  } satisfies ICommunityPlatformUserProfile.IRequest;

  const pageOfProfiles: IPageICommunityPlatformUserProfile.ISummary =
    await api.functional.communityPlatform.profiles.index(connection, {
      body: profileSearchBody,
    });
  typia.assert<IPageICommunityPlatformUserProfile.ISummary>(pageOfProfiles);

  const { pagination, data } = pageOfProfiles;

  // 4. Validate pagination metadata and that data length does not
  // exceed the requested limit.
  TestValidator.equals(
    "requested limit should equal pagination.limit",
    pagination.limit,
    pageRequest.limit,
  );

  TestValidator.predicate(
    "returned data length must be within [0, limit]",
    data.length >= 0 && data.length <= pagination.limit,
  );

  // 5. Validate that, when displayName is present, it contains the
  // search token in a simple case-insensitive manner.
  for (const summary of data) {
    typia.assert<ICommunityPlatformUserProfile.ISummary>(summary);

    if (summary.displayName !== undefined) {
      const haystack = summary.displayName.toLowerCase();
      const needle = displayNameToken.toLowerCase();

      TestValidator.predicate(
        "summary.displayName should contain the filter displayName token when present",
        haystack.includes(needle),
      );
    }
  }

  // 6. Optionally fetch full profile details for the first summary to
  // ensure the GET /communityPlatform/profiles/{handle} endpoint works
  // in conjunction with search results. The summary does not expose a
  // handle field, so we cannot call the detail endpoint in a
  // type-safe way here; therefore, we limit this test to validating
  // index behavior only.
}
