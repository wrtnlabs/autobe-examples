import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

export async function test_api_reddit_post_creation_link_post(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(10),
      email: memberEmail,
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community to host the link post
  const createCommunityBody = {
    name: RandomGenerator.alphabets(10),
    title: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 1 }),
    category_name: "Technology",
    type: "public" as const,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: createCommunityBody,
    });
  typia.assert(community);
  TestValidator.equals("community creation status", community.type, "public");

  // Step 3: Create a link post with external URL
  const testUrl = "https://example.com/article/123";
  const linkPostBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: null, // Link posts typically don't have content body
    link_url: testUrl,
    reddit_community_id: community.id,
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(), // We'll use a realistic random UUID as link post type ID
  } satisfies IRedditCommunityPost.ICreate;

  const linkPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: linkPostBody,
    },
  );
  typia.assert(linkPost);

  // Step 4: Validate the link post creation
  TestValidator.equals(
    "post title matches",
    linkPost.title,
    linkPostBody.title,
  );
  TestValidator.equals(
    "post community matches",
    linkPost.community.id,
    community.id,
  );
  TestValidator.equals("post author matches", linkPost.author.id, member.id);
  TestValidator.equals("link_url matches input", linkPost.link_url, testUrl);
  TestValidator.predicate(
    "post has no content body",
    () => linkPost.content === null,
  );

  // Step 5: Create another link post with different URL format
  const anotherUrl = "https://github.com/wrtnlabs/autobe/releases";
  const anotherLinkPostBody = {
    title: RandomGenerator.name(4),
    link_url: anotherUrl,
    reddit_community_id: community.id,
    reddit_post_type_id: linkPostBody.reddit_post_type_id,
    // content is omitted for link posts (not set to null or undefined)
  } satisfies IRedditCommunityPost.ICreate;

  const anotherLinkPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: anotherLinkPostBody,
    });
  typia.assert(anotherLinkPost);

  TestValidator.equals(
    "second link post title matches",
    anotherLinkPost.title,
    anotherLinkPostBody.title,
  );
  TestValidator.equals(
    "second link URL matches",
    anotherLinkPost.link_url,
    anotherUrl,
  );
  TestValidator.predicate(
    "second post has no content",
    () => anotherLinkPost.content === null,
  );

  // Step 6: Validate initial state properties for new posts
  TestValidator.equals("new post has zero upvotes", linkPost.upvote_count, 0);
  TestValidator.equals(
    "new post has zero downvotes",
    linkPost.downvote_count,
    0,
  );
  TestValidator.equals("new post has zero comments", linkPost.comment_count, 0);
  TestValidator.equals("new post is not locked", linkPost.is_locked, false);
  TestValidator.equals("new post is not pinned", linkPost.is_pinned, false);

  TestValidator.equals(
    "second post also has zero upvotes",
    anotherLinkPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "second post is not locked",
    anotherLinkPost.is_locked,
    false,
  );
}
