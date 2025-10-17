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

export async function test_api_votes_index_filter_by_post(
  connection: api.IConnection,
) {
  // 1) Create isolated connection objects for each test user so tokens do not overwrite each other
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const voter1Conn: api.IConnection = { ...connection, headers: {} };
  const voter2Conn: api.IConnection = { ...connection, headers: {} };

  // 2) Register author member
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(authorConn, {
      body: {
        username: `author_${RandomGenerator.alphaNumeric(6)}`,
        email: authorEmail,
        password: "P@ssw0rd!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(author);

  // 3) Author creates a community
  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(authorConn, {
      body: {
        name: `community-${RandomGenerator.alphaNumeric(6)}`,
        slug: `c-${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(community);

  // 4) Author creates a text post in that community
  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(authorConn, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPortalPost.ICreate,
    });
  typia.assert(post);

  // 5) Create voter1 and cast an upvote (+1)
  const voter1Email = typia.random<string & tags.Format<"email">>();
  const voter1 = await api.functional.auth.member.join(voter1Conn, {
    body: {
      username: `voter1_${RandomGenerator.alphaNumeric(6)}`,
      email: voter1Email,
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPortalMember.ICreate,
  });
  typia.assert(voter1);

  const vote1: ICommunityPortalVote =
    await api.functional.communityPortal.member.posts.votes.create(voter1Conn, {
      postId: post.id,
      body: {
        value: 1,
      } satisfies ICommunityPortalVote.ICreate,
    });
  typia.assert(vote1);

  // 6) Create voter2 and cast a downvote (-1)
  const voter2Email = typia.random<string & tags.Format<"email">>();
  const voter2 = await api.functional.auth.member.join(voter2Conn, {
    body: {
      username: `voter2_${RandomGenerator.alphaNumeric(6)}`,
      email: voter2Email,
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPortalMember.ICreate,
  });
  typia.assert(voter2);

  const vote2: ICommunityPortalVote =
    await api.functional.communityPortal.member.posts.votes.create(voter2Conn, {
      postId: post.id,
      body: {
        value: -1,
      } satisfies ICommunityPortalVote.ICreate,
    });
  typia.assert(vote2);

  // 7) Use author's connection (still authenticated) to call votes.index filtered by postId
  const page: IPageICommunityPortalVote.ISummary =
    await api.functional.communityPortal.member.votes.index(authorConn, {
      body: {
        postId: post.id,
        limit: 100,
        offset: 0,
      } satisfies ICommunityPortalVote.IRequest,
    });
  typia.assert(page);

  // 8) Validate: all returned items have post_id === post.id, values are ±1, and pagination.records matches returned data length for this small test
  TestValidator.predicate(
    "all votes target the filtered post",
    page.data.every((v) => v.post_id === post.id),
  );

  TestValidator.predicate(
    "all vote values are +1 or -1",
    page.data.every((v) => v.value === 1 || v.value === -1),
  );

  TestValidator.equals(
    "pagination records equals returned data length",
    page.pagination.records,
    page.data.length,
  );

  // 9) Unauthenticated callers should receive an error (401). Create an unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to votes index should fail",
    async () => {
      await api.functional.communityPortal.member.votes.index(unauthConn, {
        body: {
          postId: post.id,
        } satisfies ICommunityPortalVote.IRequest,
      });
    },
  );
}
