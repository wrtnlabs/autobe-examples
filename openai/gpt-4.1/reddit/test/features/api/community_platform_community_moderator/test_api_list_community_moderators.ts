import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";

/**
 * Validate fetching the full list of moderators for a community with
 * pagination, search, and data integrity.
 *
 * 1. Register a new user (becoming the community creator).
 * 2. Create a community as this user.
 * 3. Assign self as the community's moderator.
 * 4. Fetch the list of moderators for this community via the index (patch)
 *    endpoint.
 * 5. Verify pagination defaults, search/sort, and the assigned moderator is listed
 *    with correct structure.
 */
export async function test_api_list_community_moderators(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const joinInput = {
    email,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(user);
  TestValidator.equals(
    "registered user email matches input",
    user.email,
    email,
  );

  // 2. Create a community
  const communityInput = {
    name: RandomGenerator.alphaNumeric(12).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 6,
      wordMax: 14,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityInput,
    });
  typia.assert(community);
  TestValidator.equals(
    "creator_user_id matches user.id",
    community.creator_user_id,
    user.id,
  );

  // 3. Assign self as moderator
  const modCreateInput = {
    user_id: user.id,
  } satisfies ICommunityPlatformCommunityModerator.ICreate;
  const moderator =
    await api.functional.communityPlatform.user.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: modCreateInput,
      },
    );
  typia.assert(moderator);
  TestValidator.equals(
    "moderator.community.id matches created community",
    moderator.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator.user.id matches user.id",
    moderator.user.id,
    user.id,
  );

  // 4. Fetch moderators list with default pagination
  const modListReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformCommunityModerator.IRequest;
  const modList =
    await api.functional.communityPlatform.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: modListReq,
      },
    );
  typia.assert(modList);
  const found = modList.data.find((m) => m.user.id === user.id);
  TestValidator.predicate("moderator is included in returned list", !!found);
  if (found) {
    TestValidator.equals(
      "listed moderator user id matches",
      found.user.id,
      user.id,
    );
    TestValidator.equals(
      "listed moderator community id matches",
      found.community.id,
      community.id,
    );
  }
  TestValidator.equals("pagination matches defaults", modList.pagination, {
    current: 1,
    limit: 20,
    records: modList.data.length,
    pages: 1,
  });

  // 5. Test search (should match user display_name)
  const modListSearch =
    await api.functional.communityPlatform.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          ...modListReq,
          search: user.display_name,
        },
      },
    );
  typia.assert(modListSearch);
  TestValidator.predicate(
    "search returns moderator",
    !!modListSearch.data.find((x) => x.user.id === user.id),
  );

  // 6. Test sort_by & order
  const modListAlpha =
    await api.functional.communityPlatform.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          ...modListReq,
          sort_by: "display_name",
          order: "asc",
        },
      },
    );
  typia.assert(modListAlpha);
  TestValidator.predicate(
    "sort_by returns moderator",
    !!modListAlpha.data.find((x) => x.user.id === user.id),
  );

  // Edge case: page exceeds number of pages
  const modListEmpty =
    await api.functional.communityPlatform.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          ...modListReq,
          page: 100,
        },
      },
    );
  typia.assert(modListEmpty);
  TestValidator.equals(
    "empty list when page out-of-range",
    modListEmpty.data.length,
    0,
  );
}
