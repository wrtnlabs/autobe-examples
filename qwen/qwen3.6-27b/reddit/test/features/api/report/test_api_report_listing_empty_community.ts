import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityReport";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
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

/**
 * Validates empty report listing behavior for a community without any reported content.
 *
 * The test simulates a moderator querying a brand-new community where no posts, comments, or reports exist. It verifies that the endpoint gracefully handles empty result sets by returning an empty data array and pagination metadata reflecting zero records and zero pages. This ensures robust edge-case handling for moderation dashboards when communities are freshly created or completely free of flagged content.
 *
 * 1. Authenticates a new member who will assume both community owner and moderator roles.
 * 2. Creates a fresh community with randomized details to establish the target scope.
 * 3. Appoints the authenticated member as a moderator for the newly created community.
 * 4. Queries the community's pending report listing endpoint with standard pagination filters.
 * 5. Validates that the returned data array is empty, pagination records total is zero, and page count is zero.
 */
export async function test_api_report_listing_empty_community(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IREdditLikeCommunityMember.IJoin>(),
  });
  typia.assert(memberAuth);
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  const moderator =
    await generate_random_reddit_like_community_member_communities_community_moderators_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: { member_id: memberAuth.id },
      },
    );
  typia.assert(moderator);
  const reports =
    await api.functional.redditLikeCommunity.member.reports.community.index(
      memberConnection,
      {
        communityId: community.id,
        body: typia.random<IREdditLikeCommunityReport.IRequest>(),
      },
    );
  typia.assert(reports);
  TestValidator.equals("data array is empty", reports.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    reports.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", reports.pagination.pages, 0);
}
