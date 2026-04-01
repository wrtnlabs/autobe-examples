import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_post_comment_retrieval_with_author_and_vote_score(
  connection: api.IConnection,
): Promise<void> {
  // Store test data for verification
  const testUsername = RandomGenerator.name(1);
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      username: testUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create multiple comments
  const comment1Content = RandomGenerator.paragraph({ sentences: 2 });
  const comment1 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: comment1Content,
        },
      },
    );
  typia.assert(comment1);
  const comment2Content = RandomGenerator.paragraph({ sentences: 3 });
  const comment2 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: comment2Content,
        },
      },
    );
  typia.assert(comment2);
  const comment3Content = RandomGenerator.paragraph({ sentences: 1 });
  const comment3 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: comment3Content,
        },
      },
    );
  typia.assert(comment3);
  // 6. Note: No vote API available in provided functions, vote_score will be 0
  // 7. Soft-delete comment3
  await api.functional.redditCommunity.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: comment3.id,
    },
  );
  // 8. Retrieve comments
  const response = await api.functional.redditCommunity.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sort: "new",
        limit: 20,
        page: 1,
      },
    },
  );
  typia.assert(response);
  // 9. Verify response includes all active comments (comment3 should be excluded)
  TestValidator.equals("active comment count", response.data.length, 2);
  TestValidator.predicate(
    "comment1 exists in results",
    response.data.some((c) => c.id === comment1.id),
  );
  TestValidator.predicate(
    "comment2 exists in results",
    response.data.some((c) => c.id === comment2.id),
  );
  TestValidator.predicate(
    "comment3 excluded (soft-deleted)",
    !response.data.some((c) => c.id === comment3.id),
  );
  // 10. Verify author information and content
  const retrievedComment1 = response.data.find((c) => c.id === comment1.id);
  TestValidator.predicate(
    "comment1 has author info",
    retrievedComment1 !== undefined && retrievedComment1.author !== undefined,
  );
  TestValidator.equals(
    "comment1 author username",
    retrievedComment1!.author.username,
    testUsername,
  );
  TestValidator.equals(
    "comment1 content matches",
    retrievedComment1!.content,
    comment1Content,
  );
  const retrievedComment2 = response.data.find((c) => c.id === comment2.id);
  TestValidator.predicate(
    "comment2 has author info",
    retrievedComment2 !== undefined && retrievedComment2.author !== undefined,
  );
  TestValidator.equals(
    "comment2 author username",
    retrievedComment2!.author.username,
    testUsername,
  );
  TestValidator.equals(
    "comment2 content matches",
    retrievedComment2!.content,
    comment2Content,
  );
  // 11. Verify vote scores are 0 (no votes cast)
  TestValidator.equals("comment1 vote score", retrievedComment1!.vote_score, 0);
  TestValidator.equals("comment2 vote score", retrievedComment2!.vote_score, 0);
  // 12. Verify pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals("total records", response.pagination.records, 2);
  TestValidator.equals("total pages", response.pagination.pages, 1);
  // 13. Verify timestamps exist and deleted_at is null for active comments
  TestValidator.predicate(
    "comment1 has created_at",
    retrievedComment1!.created_at !== null &&
      retrievedComment1!.created_at !== undefined,
  );
  TestValidator.predicate(
    "comment1 has updated_at",
    retrievedComment1!.updated_at !== null &&
      retrievedComment1!.updated_at !== undefined,
  );
  TestValidator.predicate(
    "comment1 deleted_at is null",
    retrievedComment1!.deleted_at === null,
  );
  TestValidator.predicate(
    "comment2 deleted_at is null",
    retrievedComment2!.deleted_at === null,
  );
}
