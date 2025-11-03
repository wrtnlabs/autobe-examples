import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostVote";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_post_vote_create_update_by_member(
  connection: api.IConnection,
) {
  // 1. Prepare isolated connection contexts for author and voter
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const voterConn: api.IConnection = { ...connection, headers: {} };

  // Useful unique suffix to avoid collisions
  const suffix = String(Date.now()).slice(-6);

  // 2. Author: join
  const authorUsername = `author_${RandomGenerator.alphaNumeric(6)}`;
  const authorEmail = `${authorUsername}@example.test`;
  const authorAuth = await api.functional.auth.communityMember.join(
    authorConn,
    {
      body: {
        email: authorEmail,
        username: authorUsername,
        password: "Passw0rd!",
        session_context: {
          href: "http://example.test/welcome",
          referrer: "http://example.test/ref",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    },
  );
  typia.assert(authorAuth);
  const author = authorAuth.member;
  typia.assert(author);

  // 3. Voter: join
  const voterUsername = `voter_${RandomGenerator.alphaNumeric(6)}`;
  const voterEmail = `${voterUsername}@example.test`;
  const voterAuth = await api.functional.auth.communityMember.join(voterConn, {
    body: {
      email: voterEmail,
      username: voterUsername,
      password: "Passw0rd!",
      session_context: {
        href: "http://example.test/welcome",
        referrer: "http://example.test/ref",
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(voterAuth);
  const voter = voterAuth.member;
  typia.assert(voter);

  // 4. Author creates a community
  const communitySlug = `test-community-${suffix}`;
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      authorConn,
      {
        body: {
          name: `Test Community ${suffix}`,
          slug: communitySlug,
          description: "E2E test community for vote lifecycle",
          visibility: "public",
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community has slug",
    community.slug === communitySlug,
  );

  // 5. Author creates a post in the community
  const createPostBody = {
    title: `E2E Vote Test Post ${suffix}`,
    body: RandomGenerator.paragraph({ sentences: 8 }),
    post_type: "text",
  } satisfies ICommunityBbsPost.ICreate;

  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      authorConn,
      {
        communitySlug: community.slug,
        body: createPostBody,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community.slug,
    community.slug,
  );

  // 6. Voter casts an upvote (value: 1)
  const firstVote =
    await api.functional.communityBbs.communityMember.posts.votes.create(
      voterConn,
      {
        postId: post.id,
        body: {
          value: 1,
        } satisfies ICommunityBbsPostVote.ICreate,
      },
    );
  typia.assert(firstVote);
  TestValidator.equals("first vote value is upvote", firstVote.value, 1);
  TestValidator.equals("first vote kind is up", firstVote.vote_kind, "up");

  // 7. Idempotency: repeat the same upvote and expect the same vote record (no duplicate)
  const repeatVote =
    await api.functional.communityBbs.communityMember.posts.votes.create(
      voterConn,
      {
        postId: post.id,
        body: {
          value: 1,
        } satisfies ICommunityBbsPostVote.ICreate,
      },
    );
  typia.assert(repeatVote);
  TestValidator.equals(
    "idempotent vote returns same id",
    repeatVote.id,
    firstVote.id,
  );
  TestValidator.equals(
    "idempotent vote value unchanged",
    repeatVote.value,
    firstVote.value,
  );

  // 8. Vote update: change to downvote (-1) and expect the same vote id with updated value
  const updatedVote =
    await api.functional.communityBbs.communityMember.posts.votes.create(
      voterConn,
      {
        postId: post.id,
        body: {
          value: -1,
        } satisfies ICommunityBbsPostVote.ICreate,
      },
    );
  typia.assert(updatedVote);
  TestValidator.equals(
    "updated vote keeps same id",
    updatedVote.id,
    firstVote.id,
  );
  TestValidator.equals("updated vote value is -1", updatedVote.value, -1);
  TestValidator.equals(
    "updated vote kind is down",
    updatedVote.vote_kind,
    "down",
  );

  // 9. Error condition: voting on a non-existent post should fail
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "voting on non-existent post should fail",
    async () => {
      await api.functional.communityBbs.communityMember.posts.votes.create(
        voterConn,
        {
          postId: fakePostId,
          body: {
            value: 1,
          } satisfies ICommunityBbsPostVote.ICreate,
        },
      );
    },
  );

  // Note: DB-level assertions (direct Prisma queries) and post re-fetch to
  // validate cached aggregates/author.karma are not implementable because the
  // provided SDK does not include read endpoints or Prisma access. The test
  // therefore validates voting semantics via API responses and error handling.
}
