import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test edge case where filtering for moderators returns empty results when only the owner exists.
 *
 * Validates the filter behavior when no matching records exist by testing the moderator list endpoint with a role filter that excludes the owner. This ensures the API correctly handles scenarios where the filter criteria match no records while the community has an owner moderator.
 *
 * 1. Authenticate as a new member via join to create an account with randomized credentials (email, password, username).
 * 2. Create a new community which auto-establishes the creator as the only moderator with owner role.
 * 3. Call the moderator list endpoint with requestBody role filter set to 'moderator' (excluding owner role).
 * 4. Verify the response data array is empty since no non-owner moderators exist in the community.
 * 5. Verify pagination metadata shows records: 0 and pages: 0, confirming no matching moderators found.
 * 6. Verify the request succeeds without error despite empty results, demonstrating proper handling of edge case.
 */
export async function test_api_moderator_list_filter_moderator_when_only_owner_exists(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member (utility generates random credentials)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create community (creator becomes owner automatically)
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Call moderator list with role filter set to 'moderator' (excludes owner)
  const moderators =
    await api.functional.redditCommunity.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          role: "moderator",
        } satisfies IRedditCommunityModerator.IRequest,
      },
    );
  typia.assert(moderators);
  // 4. Verify data array is empty (no non-owner moderators)
  TestValidator.equals(
    "moderator list should be empty when only owner exists",
    moderators.data.length,
    0,
  );
  // 5. Verify pagination metadata shows records: 0 and pages: 0
  TestValidator.equals(
    "pagination records count",
    moderators.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count",
    moderators.pagination.pages,
    0,
  );
  // 6. Verify current page is 1 (default)
  TestValidator.equals("current page number", moderators.pagination.current, 1);
}
