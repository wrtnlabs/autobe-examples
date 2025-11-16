import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostType";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test community member creating a text-based discussion post within a
 * community.
 *
 * This comprehensive test validates the complete workflow of member-driven
 * discussion post creation within the Reddit Community platform. It ensures
 * members can successfully create engaging text posts that drive community
 * interaction and knowledge sharing through forum discussions.
 *
 * The test covers multiple critical aspects of post creation:
 *
 * - Member account creation and authentication setup
 * - Community establishment as the posting destination
 * - Post type verification for text-based discussions
 * - Successful post creation with title and content
 * - Proper system associations (community, author, post type)
 * - Initial engagement metrics configuration (vote counts, view counter, comment
 *   status)
 * - Content locking and pinning initialization
 *
 * This workflow mirrors real member behavior where users join communities and
 * create thoughtful discussions centered around topics of shared interest,
 * maintaining the platform's focus on community-driven content generation and
 * member engagement.
 */
export async function test_api_member_post_creation_text_discussion(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community for posting discussions
  const communityName = typia.random<
    string &
      tags.Pattern<"^[a-zA-Z0-9_]+$"> &
      tags.MinLength<3> &
      tags.MaxLength<21>
  >();
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.name(4),
        description: RandomGenerator.paragraph({ sentences: 15 }),
        category_name: "technology",
        type: RandomGenerator.pick(["public", "restricted"] as const),
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Retrieve text post type for proper association
  const postTypesResponse =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: {
        allows_text_content: true,
        limit: 10,
      } satisfies IRedditCommunityPostType.IRequest,
    });
  typia.assert(postTypesResponse);

  const textPostType = postTypesResponse.data.find(
    (pt) => pt.allows_text_content,
  );
  TestValidator.notEquals("text post type found", textPostType, undefined);
  typia.assertGuard<IRedditCommunityPostType.ISummary>(textPostType!);

  // Step 4: Create text-based discussion post
  const postContent = RandomGenerator.content({ paragraphs: 5 });
  const postTitle = RandomGenerator.name(8);

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: postTitle,
        content: postContent,
        reddit_community_id: community.id,
        reddit_post_type_id: textPostType.id,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Validate post associations are properly configured
  TestValidator.equals(
    "post has correct community",
    post.community.id,
    community.id,
  );
  TestValidator.equals("post has correct author", post.author.id, member.id);
  TestValidator.equals(
    "post has correct post type",
    post.post_type.id,
    textPostType.id,
  );

  // Step 6: Verify initial engagement metrics are zero
  TestValidator.equals("initial upvote count", post.upvote_count, 0);
  TestValidator.equals("initial downvote count", post.downvote_count, 0);
  TestValidator.equals("initial view count", post.view_count, 0);
  TestValidator.equals("initial comment count", post.comment_count, 0);

  // Step 7: Confirm post is not locked or pinned by default
  TestValidator.predicate("post is not locked", post.is_locked === false);
  TestValidator.predicate("post is not pinned", post.is_pinned === false);

  // Step 8: Validate post content matches input
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post content matches", post.content, postContent);

  // Step 9: Verify post has complete community context
  TestValidator.predicate(
    "post has community name",
    post.community.name === communityName && post.community.name.length > 0,
  );
  TestValidator.predicate(
    "post has author nickname",
    post.author.nickname === member.nickname,
  );
  TestValidator.predicate(
    "post has author email",
    post.author.email === memberEmail,
  );
}
