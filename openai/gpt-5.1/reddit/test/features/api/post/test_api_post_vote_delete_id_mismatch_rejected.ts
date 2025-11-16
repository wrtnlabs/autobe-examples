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
 * Validate that deleting a post vote with mismatched postId and voteId is
 * rejected.
 *
 * Business context: A member user can vote on posts via
 * community_platform_post_votes. Each vote row links a member user to a
 * particular post (post_id). The DELETE
 * /communityPlatform/memberUser/posts/{postId}/votes/{voteId} endpoint must
 * ensure that the targeted vote row actually belongs to the specified post
 * before deleting; otherwise an unrelated vote could be removed.
 *
 * This test builds a realistic flow:
 *
 * 1. Register a member user and establish an authenticated session.
 * 2. Create two distinct communities (A and B).
 * 3. Create two posts: post A in community A, post B in community B.
 * 4. Cast a vote on post A only, capturing its vote id.
 * 5. Attempt to delete using postId = postB.id and voteId = voteOnA.id and assert
 *    that the operation fails.
 * 6. Finally, call delete with postId = postA.id and voteId = voteOnA.id and
 *    assert that it succeeds, proving the vote was still present after the
 *    failed mismatched-delete attempt.
 */
export async function test_api_post_vote_delete_id_mismatch_rejected(
  connection: api.IConnection,
) {
  // 1. Register a member user and establish authenticated session
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create two distinct communities
  const communityABody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityABody },
    );
  typia.assert(communityA);

  const communityBBody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBBody },
    );
  typia.assert(communityB);

  // 3. Create post A in community A
  const postABody = {
    communityId: communityA.id,
    communityCode: communityA.slug,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postABody,
    });
  typia.assert(postA);

  // 3b. Create post B in community B
  const postBBody = {
    communityId: communityB.id,
    communityCode: communityB.slug,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
      wordMin: 3,
      wordMax: 8,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBBody,
    });
  typia.assert(postB);

  // 4. Cast a vote on post A only
  const voteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const voteOnA: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: postA.id,
        body: voteBody,
      },
    );
  typia.assert(voteOnA);
  TestValidator.equals(
    "vote's post_id should match post A id",
    voteOnA.post_id,
    postA.id,
  );

  // 5. Attempt mismatched delete: postId = postB.id, voteId = voteOnA.id
  await TestValidator.error(
    "mismatched postId and voteId delete must be rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.votes.erase(
        connection,
        {
          postId: postB.id,
          voteId: voteOnA.id,
        },
      );
    },
  );

  // 6. Positive control: correct delete should succeed (no error)
  await api.functional.communityPlatform.memberUser.posts.votes.erase(
    connection,
    {
      postId: postA.id,
      voteId: voteOnA.id,
    },
  );
}
