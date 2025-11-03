import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentVote";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

/**
 * E2E: Comment vote cast and change by member
 *
 * Purpose: Validate that a community member can cast a vote on a comment,
 * change the vote, and that repeated identical vote submissions are idempotent
 * (create-or-update semantics). Due to template import constraints, this test
 * uses SDK responses to validate behavior instead of direct DB (Prisma)
 * assertions.
 *
 * Steps:
 *
 * 1. Create author and voter accounts via auth.communityMember.join (separate
 *    connection objects to isolate authorization headers).
 * 2. Author creates community, a post, and a top-level comment.
 * 3. Voter casts an upvote (value: 1) and assertions verify returned vote meta.
 * 4. Repeat the upvote to assert idempotency (same vote id returned).
 * 5. Voter changes vote to downvote (value: -1); assert vote updated and
 *    updated_at present.
 * 6. Repeat downvote to assert idempotency.
 */
export async function test_api_comment_vote_cast_and_change_by_member(
  connection: api.IConnection,
) {
  // Prepare per-actor connections to avoid header/token interference
  const timestamp = Date.now();
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const voterConn: api.IConnection = { ...connection, headers: {} };

  // Unique identities
  const authorEmail = `author.${timestamp}@example.test`;
  const voterEmail = `voter.${timestamp}@example.test`;
  const authorUsername = `author_${RandomGenerator.alphaNumeric(6)}`;
  const voterUsername = `voter_${RandomGenerator.alphaNumeric(6)}`;

  // 1) Sign up author
  const authorAuth = await api.functional.auth.communityMember.join(
    authorConn,
    {
      body: {
        email: authorEmail,
        username: authorUsername,
        password: "Passw0rd!",
        session_context: {
          href: "http://localhost/",
          referrer: "http://localhost/",
          ip: null,
          session_ttl_seconds: null,
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    },
  );
  typia.assert(authorAuth);
  TestValidator.predicate(
    "author signed up and token issued",
    !!authorAuth.token?.access,
  );

  // 1) Sign up voter
  const voterAuth = await api.functional.auth.communityMember.join(voterConn, {
    body: {
      email: voterEmail,
      username: voterUsername,
      password: "Passw0rd!",
      session_context: {
        href: "http://localhost/",
        referrer: "http://localhost/",
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(voterAuth);
  TestValidator.predicate(
    "voter signed up and token issued",
    !!voterAuth.token?.access,
  );

  // 2) Author creates community
  const communitySlug = `test-community-${timestamp}`;
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      authorConn,
      {
        body: {
          name: `E2E Community ${timestamp}`,
          slug: communitySlug,
          description: "Created for comment vote E2E test",
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community slug matches requested slug",
    community.slug,
    communitySlug,
  );

  // 3) Author creates a post
  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      authorConn,
      {
        communitySlug: community.slug,
        body: {
          title: "E2E test post for voting",
          post_type: "text",
          body: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post belongs to community",
    post.community.slug,
    community.slug,
  );

  // 4) Author creates a comment
  const comment =
    await api.functional.communityBbs.communityMember.posts.comments.create(
      authorConn,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment associated with post's community",
    comment.community.id,
    post.community.id,
  );

  // 5) Voter casts upvote
  const voteUp =
    await api.functional.communityBbs.communityMember.comments.votes.create(
      voterConn,
      {
        commentId: comment.id,
        body: { value: 1 } satisfies ICommunityBbsCommentVote.ICreate,
      },
    );
  typia.assert(voteUp);
  TestValidator.equals(
    "vote created references correct comment",
    voteUp.community_bbs_comment_id,
    comment.id,
  );
  TestValidator.equals("vote numeric value is up", voteUp.value, 1);
  TestValidator.equals("vote kind is up", voteUp.vote_kind, "up");
  TestValidator.predicate(
    "vote created_at present",
    voteUp.created_at !== null && voteUp.created_at !== undefined,
  );

  // 6) Repeating same upvote should be idempotent (preserve vote id)
  const voteUpRepeat =
    await api.functional.communityBbs.communityMember.comments.votes.create(
      voterConn,
      {
        commentId: comment.id,
        body: { value: 1 } satisfies ICommunityBbsCommentVote.ICreate,
      },
    );
  typia.assert(voteUpRepeat);
  TestValidator.equals(
    "repeated upvote preserves id",
    voteUpRepeat.id,
    voteUp.id,
  );
  TestValidator.equals(
    "repeated upvote preserves value",
    voteUpRepeat.value,
    1,
  );

  // 7) Change vote to downvote (-1)
  const voteDown =
    await api.functional.communityBbs.communityMember.comments.votes.create(
      voterConn,
      {
        commentId: comment.id,
        body: { value: -1 } satisfies ICommunityBbsCommentVote.ICreate,
      },
    );
  typia.assert(voteDown);
  TestValidator.equals(
    "vote id unchanged after changing to down",
    voteDown.id,
    voteUp.id,
  );
  TestValidator.equals("vote numeric value is down", voteDown.value, -1);
  TestValidator.equals("vote kind is down", voteDown.vote_kind, "down");
  TestValidator.predicate(
    "vote updated_at present after change",
    voteDown.updated_at !== null && voteDown.updated_at !== undefined,
  );

  // 8) Repeating the downvote is idempotent
  const voteDownRepeat =
    await api.functional.communityBbs.communityMember.comments.votes.create(
      voterConn,
      {
        commentId: comment.id,
        body: { value: -1 } satisfies ICommunityBbsCommentVote.ICreate,
      },
    );
  typia.assert(voteDownRepeat);
  TestValidator.equals(
    "repeated downvote preserves id",
    voteDownRepeat.id,
    voteDown.id,
  );
  TestValidator.equals(
    "repeated downvote preserves value",
    voteDownRepeat.value,
    -1,
  );

  // Limitation note (documented in test): For DB-level cached aggregate and
  // author.karma verifications or audit-log entries, extend the test harness to
  // include a Prisma client or provide read endpoints that expose the desired
  // aggregates. This test ensures correct vote upsert behavior via SDK-visible
  // artifacts.
}
