import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerator";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
 * Test filtering moderators by memberId to discover all communities where a specific user holds moderation privileges.
 * This scenario validates cross-community moderator discovery functionality. The request includes memberId filter without
 * community restriction, returning all moderator assignments for that member across different communities. Validates that
 * a member can view their own moderator roles or another member's visible moderator positions. The response includes
 * paginated results with community details for each moderator assignment, supporting the use case of viewing a member's
 * moderation portfolio.
 */
export async function test_api_moderator_list_filter_by_member_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection who will hold moderator roles
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  // 2. Create two distinct communities
  const communities: IRedditLikeCommunity[] = await ArrayUtil.asyncRepeat(
    2,
    async () =>
      generate_random_reddit_like_member_communities_create(
        memberConnection,
        {},
      ),
  );
  // 3. Subscribe member to both communities (prerequisite for moderator access)
  await ArrayUtil.asyncForEach(communities, async (community) =>
    api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    ),
  );
  // 4. Query moderators filtered by member ID
  const result: IPageIRedditLikeModerator.ISummary =
    await api.functional.redditLike.moderators.index(connection, {
      body: {
        memberId: member.id,
        page: 1,
        limit: 10,
      } satisfies IRedditLikeModerator.IRequest,
    });
  typia.assert(result);
  // 5. Validate paginated response structure
  TestValidator.predicate(
    "pagination has valid structure",
    result.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 6. Validate data array structure - if moderators exist, verify member ID matches filter
  TestValidator.predicate(
    "all returned moderators belong to the queried member",
    result.data.every((moderator) => moderator.member.id === member.id),
  );
}
