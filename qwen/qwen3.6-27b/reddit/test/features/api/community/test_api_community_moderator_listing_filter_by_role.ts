import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_moderators_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

export async function test_api_community_moderator_listing_filter_by_role(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test community moderator listing filter by role authority level.
   *
   * Validates the moderator listing endpoint's role filtering functionality. Ensures that filtering by 'owner' returns only the community creator, filtering by 'moderator' returns only appointed moderators, and omitting the filter returns all active moderators. Verifies that role assignments are correctly maintained after adding a moderator.
   *
   * 1. Owner authenticates and creates a community.
   * 2. Second member authenticates as a separate account.
   * 3. Owner appoints second member as a moderator.
   * 4. Listing with role='owner' filter returns exactly one moderator record.
   * 5. The filtered owner moderator is the community creator.
   * 6. Listing with role='moderator' filter returns exactly one moderator record.
   * 7. The filtered moderator matches the appointed member.
   * 8. Listing without filter returns both moderators.
   */
  // 1. Authenticate owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, { body: {} });
  // 2. Create community as owner
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Authenticate second member to be added as moderator
  const modMemberConnection: api.IConnection = { host: connection.host };
  const modAuth = await authorize_member_join(modMemberConnection, {
    body: {},
  });
  // 4. Owner appoints second member as moderator
  const appointed =
    await generate_random_reddit_like_community_member_communities_community_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: { member_id: modAuth.id },
      },
    );
  typia.assert(appointed);
  // 5. List moderators filtered by role='owner'
  const ownerFiltered =
    await api.functional.redditLikeCommunity.communities.community_moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          role: "owner",
        } satisfies IREdditLikeCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(ownerFiltered);
  TestValidator.equals(
    "owner filter returns single record",
    ownerFiltered.pagination.records,
    1,
  );
  TestValidator.equals(
    "owner filter data length",
    ownerFiltered.data.length,
    1,
  );
  const ownerModerator = ownerFiltered.data[0];
  TestValidator.equals("owner role is owner", ownerModerator.role, "owner");
  TestValidator.equals(
    "owner is community creator",
    ownerModerator.member.id,
    community.creator.id,
  );
  // 6. List moderators filtered by role='moderator'
  const moderatorFiltered =
    await api.functional.redditLikeCommunity.communities.community_moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          role: "moderator",
        } satisfies IREdditLikeCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorFiltered);
  TestValidator.equals(
    "moderator filter returns single record",
    moderatorFiltered.pagination.records,
    1,
  );
  TestValidator.equals(
    "moderator filter data length",
    moderatorFiltered.data.length,
    1,
  );
  const modModerator = moderatorFiltered.data[0];
  TestValidator.equals(
    "moderator role is moderator",
    modModerator.role,
    "moderator",
  );
  TestValidator.equals(
    "moderator is appointed member",
    modModerator.member.id,
    appointed.member.id,
  );
  // 7. List moderators without filter (all)
  const allModerators =
    await api.functional.redditLikeCommunity.communities.community_moderators.index(
      connection,
      {
        communityId: community.id,
        body: {} satisfies IREdditLikeCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(allModerators);
  TestValidator.equals(
    "unfiltered returns both moderators",
    allModerators.pagination.records,
    2,
  );
  TestValidator.equals("unfiltered data length", allModerators.data.length, 2);
}
