import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalVote";

export async function test_api_votes_index_forbidden_when_querying_other_user(
  connection: api.IConnection,
) {
  /**
   * Validate that a member cannot retrieve votes for a post that belongs to
   * another member's private community. Also sanity-check that the post owner
   * (vote owner) can list votes for their own post.
   *
   * Steps:
   *
   * 1. Create two isolated connections (connA, connB) to keep auth tokens
   *    separate.
   * 2. Register userA on connA and userB on connB.
   * 3. UserB creates a private community and a post within it.
   * 4. UserB casts a vote on that post.
   * 5. UserA attempts to list votes by filtering with postId and expects an error
   *    (access forbidden / not found).
   * 6. UserB lists votes for the same post successfully and the returned vote
   *    belongs to userB.
   */

  // 1. Create isolated connection contexts so each join() stores its token
  const connA: api.IConnection = { ...connection, headers: {} };
  const connB: api.IConnection = { ...connection, headers: {} };

  // 2. Register userA and userB
  const userABody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "P@ssw0rd",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const userBBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "P@ssw0rd",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const userA: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connA, { body: userABody });
  typia.assert(userA);

  const userB: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connB, { body: userBBody });
  typia.assert(userB);

  // 3. userB creates a private community
  const communityBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: true,
    visibility: "private",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connB, {
      body: communityBody,
    });
  typia.assert(community);

  // 4. userB creates a text post in the private community
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connB, {
      body: postBody,
    });
  typia.assert(post);

  // 5. userB casts a vote on that post
  const voteBody = {
    value: 1 as const,
  } satisfies ICommunityPortalVote.ICreate;

  const vote: ICommunityPortalVote =
    await api.functional.communityPortal.member.posts.votes.create(connB, {
      postId: post.id,
      body: voteBody,
    });
  typia.assert(vote);

  // 6. userA attempts to query votes for that post -> expect failure
  await TestValidator.error(
    "userA cannot query votes for a post inside another user's private community",
    async () => {
      await api.functional.communityPortal.member.votes.index(connA, {
        body: {
          postId: post.id,
        } satisfies ICommunityPortalVote.IRequest,
      });
    },
  );

  // 7. Sanity check: userB (owner) queries votes for the post and succeeds
  const page: IPageICommunityPortalVote.ISummary =
    await api.functional.communityPortal.member.votes.index(connB, {
      body: {
        postId: post.id,
        limit: 10,
        offset: 0,
      } satisfies ICommunityPortalVote.IRequest,
    });
  typia.assert(page);

  TestValidator.predicate(
    "owner query contains at least one vote from userB",
    page.data.some((s) => s.user_id === userB.id),
  );
}
