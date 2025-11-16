import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test successful retrieval of a public post by ID with all engagement metrics
 * and metadata.
 *
 * This test validates the post retrieval workflow by:
 *
 * 1. Setting up required platform infrastructure (category, community)
 * 2. Creating a public post with text content
 * 3. Retrieving the post and verifying all fields are populated correctly
 * 4. Confirming engagement metrics are initialized properly
 * 5. Validating creator and community relationship information
 */
export async function test_api_post_retrieval_public_access(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAccount);

  // Switch to admin context
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: adminAccount.token.access,
    },
  };

  // 2. Create a platform content category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Technology and software development discussions",
          icon_url: "https://example.com/tech-icon.png",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAccount);

  // Switch to member context
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: memberAccount.token.access,
    },
  };

  // 4. Create a public community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "Web Development",
          identifier: "web_dev",
          description: "Discussions about web development best practices",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a public post with text content
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: postTitle,
          content_text: postContent,
          is_nsfw: false,
          has_spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(createdPost);

  // 6. Retrieve the post by ID
  const retrievedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(memberConnection, {
      postId: createdPost.id,
    });
  typia.assert(retrievedPost);

  // 7. Validate all post fields
  TestValidator.equals("post ID matches", retrievedPost.id, createdPost.id);
  TestValidator.equals("post title matches", retrievedPost.title, postTitle);
  TestValidator.equals("post type is text", retrievedPost.post_type, "text");
  TestValidator.equals(
    "post content matches",
    retrievedPost.content_text,
    postContent,
  );
  TestValidator.equals(
    "post visibility is public",
    retrievedPost.visibility_status,
    "public",
  );
  TestValidator.equals("post is not NSFW", retrievedPost.is_nsfw, false);
  TestValidator.equals("post has no spoiler", retrievedPost.has_spoiler, false);
  TestValidator.equals("post is not locked", retrievedPost.is_locked, false);
  TestValidator.equals("post is not pinned", retrievedPost.is_pinned, false);

  // 8. Validate engagement metrics are initialized
  TestValidator.equals(
    "initial vote score is zero",
    retrievedPost.vote_score,
    0,
  );
  TestValidator.equals(
    "initial upvote count is zero",
    retrievedPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "initial downvote count is zero",
    retrievedPost.downvote_count,
    0,
  );
  TestValidator.equals(
    "initial comment count is zero",
    retrievedPost.comment_count,
    0,
  );

  // 9. Validate timestamps exist and are valid
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedPost.created_at && retrievedPost.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedPost.updated_at && retrievedPost.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedPost.deleted_at === null || retrievedPost.deleted_at === undefined,
  );

  // 10. Validate creator information
  TestValidator.equals(
    "creator ID matches member",
    retrievedPost.creator.id,
    memberAccount.id,
  );
  TestValidator.predicate(
    "creator email is set",
    retrievedPost.creator.email && retrievedPost.creator.email.length > 0,
  );
  TestValidator.equals(
    "creator account status is active",
    retrievedPost.creator.account_status,
    "active",
  );

  // 11. Validate community information
  TestValidator.equals(
    "community ID matches",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "community identifier matches",
    retrievedPost.community.identifier,
    community.identifier,
  );
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
}
