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
 * Verify that only the owning member user can update a post vote and that
 * cross-account modification attempts are rejected while preserving the
 * original vote semantics.
 *
 * Business flow covered:
 *
 * 1. MemberUser A joins the platform and becomes authenticated.
 * 2. MemberUser A creates a community.
 * 3. MemberUser A creates a post in that community.
 * 4. MemberUser A casts an initial vote on the post.
 * 5. MemberUser A successfully updates their own vote on the same post, proving
 *    the happy-path behavior for the owner.
 * 6. MemberUser B joins (separate account, separate auth context).
 * 7. MemberUser B attempts to update A's vote on the same post and is blocked by
 *    ownership checks, resulting in an HTTP error.
 *
 * This test does not rely on a read API for individual votes; instead it uses
 * successful vs. failed update behaviors to infer that ownership enforcement is
 * working as expected.
 */
export async function test_api_post_vote_update_ownership_enforced(
  connection: api.IConnection,
) {
  // 1. Register memberUser A and obtain authenticated context
  const joinBodyA = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBodyA,
    });
  typia.assert(memberA);

  // 2. Create a community as memberUser A
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
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
  TestValidator.equals(
    "community owner is memberUser A",
    community.owner_memberuser_id,
    memberA.id,
  );

  // 3. Create a post in that community as memberUser A
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post is created in the community",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author is memberUser A",
    post.author_memberuser_id,
    memberA.id,
  );

  // 4. MemberUser A casts an initial upvote on the post
  const voteBodyUp = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;
  const voteA: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: voteBodyUp,
      },
    );
  typia.assert(voteA);
  TestValidator.equals(
    "vote belongs to memberUser A",
    voteA.memberuser_id,
    memberA.id,
  );
  TestValidator.equals("vote targets the created post", voteA.post_id, post.id);
  TestValidator.equals("initial vote direction is up", voteA.direction, "up");

  // 5. MemberUser A successfully updates their own vote (owner happy-path)
  const updateBodyOwner = {
    direction: "down",
  } satisfies ICommunityPlatformPostVote.IUpdate;
  const updatedByOwner: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.update(
      connection,
      {
        postId: post.id,
        voteId: voteA.id,
        body: updateBodyOwner,
      },
    );
  typia.assert(updatedByOwner);
  TestValidator.equals(
    "owner update keeps same memberuser_id",
    updatedByOwner.memberuser_id,
    voteA.memberuser_id,
  );
  TestValidator.equals(
    "owner update keeps same post_id",
    updatedByOwner.post_id,
    voteA.post_id,
  );
  TestValidator.equals(
    "owner update changed direction to down",
    updatedByOwner.direction,
    "down",
  );
  TestValidator.notEquals(
    "owner update changes updated_at timestamp",
    updatedByOwner.updated_at,
    voteA.updated_at,
  );

  // 6. Register memberUser B and obtain its authenticated context
  const joinBodyB = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.org`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/campaign",
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBodyB,
    });
  typia.assert(memberB);
  TestValidator.notEquals(
    "memberUser B has different id from memberUser A",
    memberB.id,
    memberA.id,
  );

  // 7. MemberUser B attempts to update A's vote and should be rejected
  const updateBodyByOther = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.IUpdate;
  await TestValidator.httpError(
    "memberUser B cannot update memberUser A's vote",
    [401, 403, 404],
    async () => {
      await api.functional.communityPlatform.memberUser.posts.votes.update(
        connection,
        {
          postId: post.id,
          voteId: updatedByOwner.id,
          body: updateBodyByOther,
        },
      );
    },
  );
}
