import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussPostVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostVoteStatus";
import type { IEEconDiscussPostVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostVoteType";
import type { IEEconDiscussVoteSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteSortBy";
import type { IEEconDiscussVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteStatus";
import type { IEEconDiscussVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteType";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostVote";

export async function test_api_post_votes_admin_search_filters_pagination(
  connection: api.IConnection,
) {
  // 1) Author (member) joins and creates a post
  const authorJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!", // >= 8 chars
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      avatar_uri: undefined,
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorJoin);

  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 14,
        }),
        summary: RandomGenerator.paragraph({ sentences: 8 }),
        scheduled_publish_at: null,
        topicIds: undefined,
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 2) Voter1 joins and casts an upvote (remains active)
  const voter1Join = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      avatar_uri: undefined,
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(voter1Join);

  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: post.id,
    body: {
      vote_type: "up",
    } satisfies IEconDiscussPostVote.ICreate,
  });

  // 3) Voter2 joins, upvotes, then withdraws to create a withdrawn lifecycle state
  const voter2Join = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      avatar_uri: undefined,
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(voter2Join);

  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: post.id,
    body: {
      vote_type: "up",
    } satisfies IEconDiscussPostVote.ICreate,
  });
  await api.functional.econDiscuss.member.posts.votes.self.erase(connection, {
    postId: post.id,
  });

  // 4) Admin joins and performs filtered, paginated queries
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      avatar_uri: undefined,
    } satisfies IEconDiscussAdmin.ICreate,
  });
  typia.assert(adminJoin);

  const pageSize: number = 10;
  const pageActive = await api.functional.econDiscuss.admin.posts.votes.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        pageSize,
        voteType: "up",
        status: "active",
        postId: post.id,
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IEconDiscussPostVote.IRequest,
    },
  );
  typia.assert(pageActive);

  // Business validations for ACTIVE filter
  TestValidator.predicate(
    "active votes page returns at most pageSize records",
    pageActive.data.length <= pageActive.pagination.limit,
  );
  TestValidator.equals(
    "active votes: pagination.limit equals requested pageSize",
    pageActive.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "active votes: every record matches postId, voteType and status",
    pageActive.data.every(
      (r) =>
        r.postId === post.id && r.voteType === "up" && r.status === "active",
    ),
  );
  TestValidator.predicate(
    "active votes: at least one record present",
    pageActive.data.length >= 1,
  );

  // Query for WITHDRAWN records
  const pageWithdrawn =
    await api.functional.econDiscuss.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        pageSize,
        voteType: "up",
        status: "withdrawn",
        postId: post.id,
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IEconDiscussPostVote.IRequest,
    });
  typia.assert(pageWithdrawn);

  TestValidator.predicate(
    "withdrawn votes page returns at most pageSize records",
    pageWithdrawn.data.length <= pageWithdrawn.pagination.limit,
  );
  TestValidator.equals(
    "withdrawn votes: pagination.limit equals requested pageSize",
    pageWithdrawn.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "withdrawn votes: every record matches postId, voteType and status",
    pageWithdrawn.data.every(
      (r) =>
        r.postId === post.id && r.voteType === "up" && r.status === "withdrawn",
    ),
  );
  TestValidator.predicate(
    "withdrawn votes: at least one record present",
    pageWithdrawn.data.length >= 1,
  );

  // 5) Negative RBAC: unauthenticated should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to admin vote listing should fail",
    async () => {
      await api.functional.econDiscuss.admin.posts.votes.index(unauthConn, {
        postId: post.id,
        body: {
          page: 1,
          pageSize: 5,
          voteType: "up",
          status: "active",
          postId: post.id,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEconDiscussPostVote.IRequest,
      });
    },
  );

  // 5) Negative RBAC: member token should fail
  const memberFor403 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      avatar_uri: undefined,
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberFor403);

  await TestValidator.error(
    "member token cannot access admin vote listing",
    async () => {
      await api.functional.econDiscuss.admin.posts.votes.index(connection, {
        postId: post.id,
        body: {
          page: 1,
          pageSize: 5,
          voteType: "up",
          status: "active",
          postId: post.id,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEconDiscussPostVote.IRequest,
      });
    },
  );
}
