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
 * Validate that repeated voting on the same post by the same member user
 * updates the existing vote record instead of creating duplicates.
 *
 * Business flow:
 *
 * 1. A guest registers as a memberUser (join) and becomes authenticated.
 * 2. The authenticated memberUser creates a community.
 * 3. The memberUser creates a post within that community.
 * 4. The memberUser casts an initial upvote on the post.
 * 5. The same memberUser casts a downvote on the same post.
 * 6. The second vote response must reuse the same vote id and reflect the updated
 *    direction while keeping memberuser_id and post_id stable.
 */
export async function test_api_post_vote_update_existing_vote_direction(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser via join
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community as this memberUser
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
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
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a post in that community
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

  TestValidator.equals(
    "created post belongs to community",
    post.community_id,
    community.id,
  );

  // 4. Cast an initial upvote on the post
  const upvoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const firstVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: upvoteBody,
      },
    );
  typia.assert(firstVote);

  TestValidator.equals(
    "first vote memberuser_id matches authenticated member",
    firstVote.memberuser_id,
    member.id,
  );
  TestValidator.equals(
    "first vote post_id matches created post",
    firstVote.post_id,
    post.id,
  );
  TestValidator.equals("first vote direction is up", firstVote.direction, "up");

  // 5. Cast a downvote on the same post by the same member user
  const downvoteBody = {
    direction: "down",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const secondVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: downvoteBody,
      },
    );
  typia.assert(secondVote);

  // 6. Validate same logical vote (id stable) and updated direction
  TestValidator.equals(
    "vote id remains stable when updating direction",
    secondVote.id,
    firstVote.id,
  );
  TestValidator.equals(
    "memberuser_id remains the same on updated vote",
    secondVote.memberuser_id,
    firstVote.memberuser_id,
  );
  TestValidator.equals(
    "post_id remains the same on updated vote",
    secondVote.post_id,
    firstVote.post_id,
  );
  TestValidator.equals(
    "second vote direction is down",
    secondVote.direction,
    "down",
  );

  // created_at should be stable, updated_at should be >= created_at and
  // should change after second vote
  TestValidator.equals(
    "created_at remains stable between first and second vote",
    secondVote.created_at,
    firstVote.created_at,
  );
  await TestValidator.predicate(
    "updated_at is not earlier than created_at",
    async () => {
      const createdTime = new Date(firstVote.created_at).getTime();
      const updatedTime = new Date(secondVote.updated_at).getTime();
      return updatedTime >= createdTime;
    },
  );
}
