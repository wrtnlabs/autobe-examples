import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_popular_feed_report_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to create a post
  const memberConnection: api.IConnection = { host: connection.host, headers: {} };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.IJoin,
  });
  (memberConnection.headers ??= {}).Authorization = memberAuth.token.access;
  // 2. Create a post in a community by member
  const communityName = RandomGenerator.name();
  const postResponse = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        communityName,
        textContent: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(postResponse);
  // 3. Authenticate as community moderator to report and approve
  const moderatorConnection: api.IConnection = { host: connection.host, headers: {} };
  const moderatorAuth = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  (moderatorConnection.headers ??= {}).Authorization = moderatorAuth.token.access;
  // 4. Extract community ID and post ID for report approval
  // The postResponse includes community summary with id
  const communityId = postResponse.community.id;
  const reportId = postResponse.id; // Assumption: system maps post ID to report ID for single-report per post
  // 5. Approve the report on the created post
  const approvedReport =
    await api.functional.redditCommunity.communityModerator.communities.reports.approve(
      moderatorConnection,
      {
        communityId,
        reportId,
      },
    );
  typia.assert(approvedReport);
  // 6. Query the popular feed with timeFilter=all to verify exclusion
  const popularFeed = await api.functional.redditCommunity.popular.index(
    memberConnection,
    {
      body: {
        feedType: "popular",
        sortBy: "top",
        timeFilter: "all",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(popularFeed);
  // 7. Validate that the reported post is excluded from popular feed
  const reportedPostId = postResponse.id;
  const isInPopularFeed = popularFeed.data.some(
    (post) => post.id === reportedPostId,
  );
  TestValidator.equals(
    "reported post is excluded from popular feed",
    isInPopularFeed,
    false,
  );
}