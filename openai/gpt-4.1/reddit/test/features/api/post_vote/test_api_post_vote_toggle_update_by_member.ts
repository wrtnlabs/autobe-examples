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
 * E2E: Test toggling/updating a user's post vote (upvote <-> downvote <->
 * remove) and error scenarios.
 *
 * 1. Register main user, authenticate.
 * 2. Register secondary user (cannot modify main's vote).
 * 3. Create a community with main user.
 * 4. Create a post in the community.
 * 5. Initial upvote by main user.
 * 6. Update vote to downvote.
 * 7. Remove the vote (no is_upvote provided).
 * 8. Attempt update/removal by secondary user (should fail).
 * 9. Attempt update/removal on non-existent vote (should fail).
 */
export async function test_api_post_vote_toggle_update_by_member(
  connection: api.IConnection,
) {
  // 1. Register & authenticate main user
  const email1 = typia.random<string & tags.Format<"email">>();
  const mainUser: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email1,
        password: "TestPass123!",
        display_name: RandomGenerator.name(),
        href: "https://host/register",
        referrer: "https://host/landing",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(mainUser);

  // 2. Register secondary user
  const email2 = typia.random<string & tags.Format<"email">>();
  const secondaryUser: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email2,
        password: "TestPass123!",
        display_name: RandomGenerator.name(),
        href: "https://host/register",
        referrer: "https://host/landing",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(secondaryUser);

  // 3. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. Create post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        text_body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. User creates initial upvote
  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.user.postVotes.create(connection, {
      body: {
        community_platform_post_id: post.id,
        is_upvote: true,
      } satisfies ICommunityPlatformPostVote.ICreate,
    });
  typia.assert(vote);
  TestValidator.predicate("initial vote is upvote", vote.is_upvote === true);
  TestValidator.equals("vote not deleted after create", vote.deleted_at, null);

  // 6. Toggle to downvote
  const updatedVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.user.postVotes.update(connection, {
      postVoteId: vote.id,
      body: {
        is_upvote: false,
      } satisfies ICommunityPlatformPostVote.IUpdate,
    });
  typia.assert(updatedVote);
  TestValidator.predicate(
    "vote toggled to downvote",
    updatedVote.is_upvote === false,
  );
  TestValidator.equals(
    "vote not deleted after update",
    updatedVote.deleted_at,
    null,
  );

  // 7. Remove vote (is_upvote omitted)
  const removedVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.user.postVotes.update(connection, {
      postVoteId: vote.id,
      body: {
        // is_upvote omitted intentionally
      } satisfies ICommunityPlatformPostVote.IUpdate,
    });
  typia.assert(removedVote);
  TestValidator.equals(
    "vote record marked as deleted",
    typeof removedVote.deleted_at,
    "string",
  );

  // 8. Login as secondary user
  await api.functional.auth.user.join(connection, {
    body: {
      email: email2,
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: "https://host/register",
      referrer: "https://host/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Secondary user tries to update vote
  await TestValidator.error(
    "secondary user cannot update another's vote",
    async () => {
      await api.functional.communityPlatform.user.postVotes.update(connection, {
        postVoteId: vote.id,
        body: {
          is_upvote: true,
        } satisfies ICommunityPlatformPostVote.IUpdate,
      });
    },
  );

  // 9. Attempt to update non-existent vote
  await TestValidator.error("cannot update nonexistent vote", async () => {
    await api.functional.communityPlatform.user.postVotes.update(connection, {
      postVoteId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        is_upvote: true,
      } satisfies ICommunityPlatformPostVote.IUpdate,
    });
  });
}
