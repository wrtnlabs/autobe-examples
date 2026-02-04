import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_feed_home_subscribed(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate member using authorization utility
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create a community using generation utility
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // Step 3: Subscribe member to the community
  await api.functional.communityPlatform.member.communities.subscribers.create(
    memberConnection,
    {
      communityCode: community.community_code,
    },
  );
  // Step 4: Create a post in the subscribed community
  const post: ICommunityPlatformPost =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
          // Use 'text' property instead of non-existent 'content' property
          text: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformPost.ICreate,
        params: {
          communityName: community.community_code,
        },
      },
    );
  // Step 5: Create a post in an unsubscribed community to verify exclusion
  const unrelatedCommunity: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  const unrelatedPost: ICommunityPlatformPost =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
          // Use 'text' property instead of non-existent 'content' property
          text: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformPost.ICreate,
        params: {
          communityName: unrelatedCommunity.community_code,
        },
      },
    );
  // Step 6: Retrieve Home Feed with the member's authenticated connection
  // Home Feed uses PATCH /communityPlatform/member/posts with sort: 'new' and no timeRange
  const feed: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.member.posts.index(
      memberConnection,
      {
        body: {
          sort: "new",
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  // Step 7: Validate pagination structure
  TestValidator.equals("pagination current page", feed.pagination.current, 1);
  TestValidator.equals("pagination limit", feed.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records > 0",
    feed.pagination.records > 0,
  );
  TestValidator.equals(
    "pagination pages",
    feed.pagination.pages,
    Math.ceil(feed.pagination.records / feed.pagination.limit),
  );
  // Step 8: Validate that only subscribed community posts are returned
  // We should only see the post from the subscribed community, not from the unrelated community
  TestValidator.equals("feed data has exactly 1 post", feed.data.length, 1);
  // Step 9: Validate the feed contains the correct post data
  const returnedPost = feed.data[0];
  // Verify post is from subscribed community using available properties
  // The author property on ISummary is empty {}, so we cannot validate any author properties
  // The community property on ISummary has 'name' which matches our community.community_code
  TestValidator.equals(
    "community name matches",
    returnedPost.community.name,
    community.community_code,
  );
  // Verify vote score is 0 (new post with no votes)
  TestValidator.equals("vote score is 0", returnedPost.voteScore, 0);
  // Verify comment count is 0 (new post with no comments)
  TestValidator.equals("comment count is 0", returnedPost.commentCount, 0);
  // Verify created_at is a valid ISO date-time format
  TestValidator.predicate(
    "created_at is ISO date-time",
    typia.is<string & tags.Format<"date-time">>(returnedPost.createdAt),
  );
  // Step 10: Validate that unrelated community post does NOT appear in Home Feed
  // This is already ensured by data.length == 1 since there's only 1 post
}
