import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test the complete workflow of a member creating a post in a community and
 * then successfully deleting their own post.
 *
 * This scenario validates the soft delete functionality where the post is
 * marked as deleted (deleted_at timestamp set) but remains in the database for
 * audit purposes.
 *
 * Test Flow:
 *
 * 1. Moderator joins and creates a community
 * 2. Member joins and authenticates
 * 3. Member creates a text post in the community
 * 4. Member deletes their own post
 * 5. Verify soft delete - post has deleted_at timestamp and retains all data
 */
export async function test_api_post_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Moderator joins to create community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorNickname = RandomGenerator.name();

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Member joins and authenticates
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Member creates a text post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 7,
  });
  const postBody = RandomGenerator.content({ paragraphs: 2 });

  const createdPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: postTitle,
        post_type: "text",
        body: postBody,
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(createdPost);

  // Verify post was created correctly
  TestValidator.equals(
    "post community ID matches",
    createdPost.community_id,
    community.id,
  );
  TestValidator.equals(
    "post member ID matches",
    createdPost.member_id,
    member.id,
  );
  TestValidator.equals("post title matches", createdPost.title, postTitle);
  TestValidator.equals("post body matches", createdPost.body, postBody);
  TestValidator.equals("post type is text", createdPost.post_type, "text");
  TestValidator.predicate(
    "post not edited initially",
    createdPost.edited === false,
  );
  TestValidator.predicate(
    "post not deleted initially",
    createdPost.deleted_at === null || createdPost.deleted_at === undefined,
  );

  // Step 5: Member deletes their own post (soft delete)
  const deletedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.erase(connection, {
      postId: createdPost.id,
    });
  typia.assert(deletedPost);

  // Step 6: Verify soft delete functionality
  TestValidator.equals(
    "deleted post ID matches created post",
    deletedPost.id,
    createdPost.id,
  );
  TestValidator.equals(
    "deleted post community ID preserved",
    deletedPost.community_id,
    community.id,
  );
  TestValidator.equals(
    "deleted post member ID preserved",
    deletedPost.member_id,
    member.id,
  );
  TestValidator.equals(
    "deleted post title preserved",
    deletedPost.title,
    postTitle,
  );
  TestValidator.equals(
    "deleted post body preserved",
    deletedPost.body,
    postBody,
  );
  TestValidator.equals(
    "deleted post type preserved",
    deletedPost.post_type,
    "text",
  );

  // Critical: Verify soft delete - deleted_at timestamp should be set
  TestValidator.predicate(
    "post has deleted_at timestamp set",
    deletedPost.deleted_at !== null && deletedPost.deleted_at !== undefined,
  );

  // Verify all original data is preserved (audit trail)
  TestValidator.equals(
    "created_at timestamp preserved",
    deletedPost.created_at,
    createdPost.created_at,
  );
  TestValidator.equals(
    "edited flag preserved",
    deletedPost.edited,
    createdPost.edited,
  );
}
