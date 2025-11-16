import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Tests that multiple different members can create comments on the same post
 * with proper authentication and attribution.
 *
 * This test validates the multi-user discussion capability of the Reddit
 * Community platform by ensuring that:
 *
 * 1. Multiple members can independently authenticate
 * 2. Each member can create comments on the same post
 * 3. Each comment is properly attributed to its respective author
 * 4. Comment ownership is correctly maintained through JWT authentication
 *
 * Test Flow:
 *
 * 1. Create a moderator and establish a community
 * 2. Create a post in the community
 * 3. Register and authenticate 3 different members
 * 4. Each member creates a comment on the same post
 * 5. Verify that each comment has the correct member_id attribution
 */
export async function test_api_comment_creation_by_multiple_members(
  connection: api.IConnection,
) {
  const MEMBER_COUNT = 3;

  // Step 1: Create moderator and community
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a community as moderator
  const communityData = {
    name: RandomGenerator.alphaNumeric(10).toLowerCase(),
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create the first member to create a post
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphaNumeric(12);
  const member1Data = {
    username: RandomGenerator.alphaNumeric(10).toLowerCase(),
    email: member1Email,
    password: member1Password,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member1: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: member1Data,
    });
  typia.assert(member1);

  // Step 4: Create a post as member1
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Create multiple different members for commenting
  const memberCredentials: Array<{
    email: string;
    password: string;
    memberId: string;
  }> = [];

  for (let i = 0; i < MEMBER_COUNT; i++) {
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(12);
    const memberData = {
      username: RandomGenerator.alphaNumeric(10).toLowerCase(),
      email: email,
      password: password,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: true,
      show_subscribed_communities: true,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate;

    const member: IRedditCommunityGuest.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: memberData,
      });
    typia.assert(member);

    memberCredentials.push({
      email: email,
      password: password,
      memberId: member.id,
    });
  }

  // Step 6: Each member creates a comment on the same post
  const createdComments: IRedditCommunityComment[] = [];

  for (let i = 0; i < memberCredentials.length; i++) {
    const credential = memberCredentials[i];

    // Login as this member
    const loginData = {
      username: undefined,
      email: credential.email,
      password: credential.password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin;

    await api.functional.auth.member.login(connection, {
      body: loginData,
    });

    // Create a comment as this member
    const commentData = {
      body: RandomGenerator.paragraph({ sentences: 3 }),
      parent_comment_id: null,
    } satisfies IRedditCommunityComment.ICreate;

    const comment: IRedditCommunityComment =
      await api.functional.redditCommunity.member.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentData,
        },
      );
    typia.assert(comment);

    createdComments.push(comment);

    // Verify the comment belongs to the correct member
    TestValidator.equals(
      "comment is attributed to the correct member",
      comment.reddit_community_member_id,
      credential.memberId,
    );

    // Verify the comment is associated with the correct post
    TestValidator.equals(
      "comment is associated with the correct post",
      comment.reddit_community_post_id,
      post.id,
    );

    // Verify comment properties
    TestValidator.predicate("comment has valid ID", comment.id.length > 0);
    TestValidator.equals(
      "comment depth is 0 for top-level comment",
      comment.depth,
      0,
    );
    TestValidator.equals(
      "comment is not edited initially",
      comment.edited,
      false,
    );
    TestValidator.predicate(
      "comment parent_comment_id is null for top-level",
      comment.parent_comment_id === null,
    );
  }

  // Step 7: Verify all comments are distinct and properly attributed
  TestValidator.equals(
    "all comments were created",
    createdComments.length,
    MEMBER_COUNT,
  );

  // Verify all comments have different IDs
  const commentIds = createdComments.map((c) => c.id);
  const uniqueIds = new Set(commentIds);
  TestValidator.equals(
    "all comments have unique IDs",
    uniqueIds.size,
    createdComments.length,
  );

  // Verify all comments are attributed to different members
  const memberIds = createdComments.map((c) => c.reddit_community_member_id);
  const uniqueMemberIds = new Set(memberIds);
  TestValidator.equals(
    "all comments are attributed to different members",
    uniqueMemberIds.size,
    createdComments.length,
  );

  // Verify all member IDs match the expected credentials
  for (let i = 0; i < createdComments.length; i++) {
    const comment = createdComments[i];
    const credential = memberCredentials[i];
    TestValidator.equals(
      `comment ${i} member ID matches credential`,
      comment.reddit_community_member_id,
      credential.memberId,
    );
  }
}
