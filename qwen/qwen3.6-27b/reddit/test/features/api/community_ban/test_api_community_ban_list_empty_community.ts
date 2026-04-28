import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

/**
 * Test retrieving ban records for a community with no active bans.
 *
 * Validates that the community bans endpoint correctly returns a paginated empty result structure when no moderation actions have been performed. Authenticates a member, creates a new community, and queries its ban records to ensure the response contains an empty data array. Verifies pagination metadata accurately reflects zero results with records count of 0, pages of 0, and current page defaulting to 1, confirming graceful handling of communities without bans.
 *
 * 1. Authenticates as a new member using registration credentials.
 * 2. Creates a new community that serves as the target for the ban query.
 * 3. Retrieves the ban records for the newly created community.
 * 4. Validates that the returned data array is empty and pagination metadata correctly reflects zero results.
 */
export async function test_api_community_ban_list_empty_community(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    },
  });
  // 2. Create a new community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(community);
  // 3. Query bans on the empty community
  const bans =
    await api.functional.redditLikeCommunity.communities.community_bans.index(
      memberConnection,
      {
        communityId: community.id,
        body: {} satisfies IREdditLikeCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(bans);
  // 4. Validate empty result and pagination metadata
  TestValidator.equals("ban data array is empty", bans.data.length, 0);
  TestValidator.equals(
    "pagination records count is 0",
    bans.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", bans.pagination.pages, 0);
  TestValidator.equals(
    "pagination current page defaults to 1",
    bans.pagination.current,
    1,
  );
}
