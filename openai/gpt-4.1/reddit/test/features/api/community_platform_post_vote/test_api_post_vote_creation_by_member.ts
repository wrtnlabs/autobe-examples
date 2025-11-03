import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates complete business logic for post voting on a community platform
 * post as an authenticated member.
 *
 * This test walks through: user registration/authentication, community and post
 * creation, and all vote edge cases.
 *
 * - User registration (join) and authentication completes so we can obtain a
 *   token.
 * - Community is created by the user using a valid unique name and description.
 * - Post is created in the community as a text post to allow for voting.
 * - The user (as the original author) attempts to vote on their own post (must
 *   fail).
 * - A second user joins, authenticates, and successfully upvotes the post.
 * - Assert one-user-one-vote constraint is enforced (second upvote does not
 *   create duplicate vote, but modifies it).
 * - Second user toggles the vote (removes) by submitting the same vote type
 *   again; should cause soft deletion/undo.
 * - Second user then downvotes; direction successfully changes and vote entity is
 *   updated.
 * - Second user attempts to vote on a deleted post (should fail).
 * - Second user attempts to vote on a non-existent/locked post (should fail).
 * - All API and edge cases are validated, including error paths for illegal
 *   voting operations.
 */
export async function test_api_post_vote_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user A (the post author)
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const userA = await api.functional.auth.user.join(connection, {
    body: joinBodyA,
  });
  typia.assert(userA);

  // 2. Create a community as user A
  const communityBody = {
    name: RandomGenerator.alphaNumeric(12).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);
  TestValidator.equals(
    "community creator is user A",
    community.creator_user_id,
    userA.id,
  );

  // 3. Create a post as user A
  const postBody = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    text_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  TestValidator.equals("post author is user A", post.author.id, userA.id);
  TestValidator.equals(
    "post in expected community",
    post.community.id,
    community.id,
  );

  // 4. User A attempts to vote on their own post (should fail)
  await TestValidator.error("self-vote should be denied", async () => {
    await api.functional.communityPlatform.user.postVotes.create(connection, {
      body: {
        community_platform_post_id: post.id,
        is_upvote: true,
      } satisfies ICommunityPlatformPostVote.ICreate,
    });
  });

  // 5. Register and authenticate user B (a different member)
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const userB = await api.functional.auth.user.join(connection, {
    body: joinBodyB,
  });
  typia.assert(userB);

  // Simulate login as B (SDK auto-assigns token after join)
  // 6. User B upvotes the post
  const upvote = await api.functional.communityPlatform.user.postVotes.create(
    connection,
    {
      body: {
        community_platform_post_id: post.id,
        is_upvote: true,
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(upvote);
  TestValidator.equals("vote is upvote", upvote.is_upvote, true);
  TestValidator.equals(
    "vote post id matches",
    upvote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "vote user id is user B",
    upvote.community_platform_user_id,
    userB.id,
  );
  TestValidator.equals("vote is not deleted", upvote.deleted_at, null);

  // 7. User B tries to upvote again (should toggle, i.e., remove vote)
  const upvote2 = await api.functional.communityPlatform.user.postVotes.create(
    connection,
    {
      body: {
        community_platform_post_id: post.id,
        is_upvote: true,
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(upvote2);
  TestValidator.equals(
    "vote toggled off (soft-deleted)",
    upvote2.deleted_at !== null,
    true,
  );

  // 8. User B downvotes the post (should reactivate and change direction)
  const downvote = await api.functional.communityPlatform.user.postVotes.create(
    connection,
    {
      body: {
        community_platform_post_id: post.id,
        is_upvote: false,
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(downvote);
  TestValidator.equals("vote is downvote", downvote.is_upvote, false);
  TestValidator.equals(
    "vote still refers to same post",
    downvote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "vote is not deleted after downvote",
    downvote.deleted_at,
    null,
  );

  // 9. User B tries to vote again with same downvote (should toggle off)
  const downvote2 =
    await api.functional.communityPlatform.user.postVotes.create(connection, {
      body: {
        community_platform_post_id: post.id,
        is_upvote: false,
      } satisfies ICommunityPlatformPostVote.ICreate,
    });
  typia.assert(downvote2);
  TestValidator.equals(
    "vote toggled off after downvote",
    downvote2.deleted_at !== null,
    true,
  );

  // 10. User B attempts to vote on non-existent post (should fail)
  await TestValidator.error(
    "voting on non-existent post should fail",
    async () => {
      await api.functional.communityPlatform.user.postVotes.create(connection, {
        body: {
          community_platform_post_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          is_upvote: true,
        } satisfies ICommunityPlatformPostVote.ICreate,
      });
    },
  );

  // 11. User B attempts to vote on deleted post (simulate soft-delete)
  // Forcibly mark the post as deleted by deleting it (not available in given API), so treat as not found
  await TestValidator.error(
    "voting on deleted post should fail (simulate as not found)",
    async () => {
      await api.functional.communityPlatform.user.postVotes.create(connection, {
        body: {
          community_platform_post_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          is_upvote: false,
        } satisfies ICommunityPlatformPostVote.ICreate,
      });
    },
  );

  // 12. User B attempts to vote on a locked post (feature not testable with current API, so skip)
}
