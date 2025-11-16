import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Validate toggling a post vote from up to down by the owning member user.
 *
 * Business flow:
 *
 * 1. Register a new member user (join) and obtain an authenticated session.
 * 2. Create a community owned by that member user.
 * 3. Create a post within the created community.
 * 4. Cast an initial upvote on the post.
 * 5. Update the same vote to be a downvote.
 * 6. Assert that direction changes from "up" to "down", id/memberuser_id/post_id
 *    stay stable, created_at is preserved, and updated_at is modified after the
 *    update.
 */
export async function test_api_post_vote_update_toggle_up_to_down(
  connection: api.IConnection,
) {
  // 1. Register member user (auth join) and authenticate connection
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // Sanity: created community owner should match authorized member user
  TestValidator.equals(
    "community owner should match authorized member",
    community.owner_memberuser_id,
    authorized.id,
  );

  // 3. Create a post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // Sanity: post should belong to the community and authored by the member user
  TestValidator.equals(
    "post community id should equal created community id",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author should be the authorized member user",
    post.author_memberuser_id,
    authorized.id,
  );

  // 4. Cast initial upvote on the post
  const upvoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const upvote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: upvoteBody,
      },
    );
  typia.assert(upvote);

  TestValidator.equals(
    "upvote should target the created post",
    upvote.post_id,
    post.id,
  );
  TestValidator.equals(
    "upvote should be owned by authorized member user",
    upvote.memberuser_id,
    authorized.id,
  );
  TestValidator.equals(
    "initial vote direction should be up",
    upvote.direction,
    "up",
  );

  // 5. Update the vote to down
  const updateBody = {
    direction: "down",
  } satisfies ICommunityPlatformPostVote.IUpdate;

  const updatedVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.update(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        voteId: upvote.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVote);

  // 6. Assertions on the updated vote
  TestValidator.equals(
    "vote id should remain stable after update",
    updatedVote.id,
    upvote.id,
  );
  TestValidator.equals(
    "memberuser_id should remain stable after update",
    updatedVote.memberuser_id,
    upvote.memberuser_id,
  );
  TestValidator.equals(
    "post_id should remain stable after update",
    updatedVote.post_id,
    upvote.post_id,
  );
  TestValidator.equals(
    "created_at must be preserved across vote update",
    updatedVote.created_at,
    upvote.created_at,
  );
  TestValidator.equals(
    "updated direction should be down",
    updatedVote.direction,
    "down",
  );

  // updated_at should logically be greater than or at least different from created_at
  // We compare string inequality as the minimal invariant; stronger ordering
  // may not be guaranteed in all environments.
  TestValidator.notEquals(
    "updated_at should change when direction is updated",
    updatedVote.updated_at,
    upvote.updated_at,
  );
}
