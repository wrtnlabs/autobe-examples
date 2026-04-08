import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityModerator";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test retrieving moderators list when a community has no assigned moderators.
 *
 * Validates that a newly created community returns an empty moderators list, confirming that only explicitly appointed moderators appear in the list and the community owner is not included. The test verifies proper pagination metadata is returned even with zero records.
 *
 * This test ensures the moderators endpoint handles the edge case of communities without any appointed moderators, returning an empty data array with valid pagination information rather than an error.
 *
 * 1. Create a member account and authenticate using authorize_member_join.
 * 2. Create a new community using the authenticated member as owner.
 * 3. Call the moderators index endpoint with the community ID.
 * 4. Validate the response has empty data array with valid pagination metadata.
 * 5. Verify records count is 0 and pages count reflects empty result set.
 */
export async function test_api_community_moderators_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community (member becomes owner)
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: `community-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Retrieve moderators list (should be empty - no moderators appointed)
  const moderators =
    await api.functional.redditLike.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {} satisfies IRedditLikeCommunityModerator.IRequest,
      },
    );
  typia.assert(moderators);
  // 4. Validate empty moderators list with proper pagination
  TestValidator.equals("data array is empty", moderators.data.length, 0);
  TestValidator.equals(
    "records count is zero",
    moderators.pagination.records,
    0,
  );
  TestValidator.predicate(
    "current page is valid",
    moderators.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", moderators.pagination.limit >= 0);
  TestValidator.predicate(
    "pages count is valid for empty result",
    moderators.pagination.pages >= 0,
  );
}
