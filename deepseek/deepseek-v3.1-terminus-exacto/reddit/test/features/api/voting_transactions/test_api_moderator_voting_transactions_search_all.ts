import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingTransaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVote";
import type { IPageICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingTransaction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_moderator_voting_transactions_search_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. 创建审核员连接
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // 2. 创建用户账户并生成投票数据
  const userIds: string[] = [];
  const postIds: string[] = [];
  // 创建第一个用户及其帖子
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  userIds.push(user1.id);
  const post1 = await generate_random_community_platform_user_posts_create(
    user1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: "test", // 需要有效社区名，假设存在
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  postIds.push(post1.id);
  // 创建upvote投票 - 生成'create'操作
  const vote1 =
    await generate_random_community_platform_user_posts_votes_create(
      user1Connection,
      {
        params: { postId: post1.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote1);
  // 更新投票到downvote - 生成'update'操作
  const vote2 =
    await generate_random_community_platform_user_posts_votes_create(
      user1Connection,
      {
        params: { postId: post1.id },
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote2);
  // 创建第二个用户进行更多投票
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  userIds.push(user2.id);
  const post2 = await generate_random_community_platform_user_posts_create(
    user2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: "test",
        post_type: "link",
        link_url: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  postIds.push(post2.id);
  const vote3 =
    await generate_random_community_platform_user_posts_votes_create(
      user2Connection,
      {
        params: { postId: post2.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote3);
  // 等待片刻确保交易记录被创建
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. 测试1: 空筛选器搜索
  const emptyFilterResult =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {} satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(emptyFilterResult);
  TestValidator.predicate(
    "empty filter should return some transactions",
    emptyFilterResult.pagination.records > 0,
  );
  // 4. 测试2: 按特定用户筛选
  const userFilterResult =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          user_id: user1.id,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(userFilterResult);
  if (userFilterResult.data.length > 0) {
    TestValidator.predicate(
      "user filter returns transactions for specified user",
      userFilterResult.data.every((t) => t.user.id === user1.id),
    );
  }
  // 5. 测试3: 按操作类型筛选
  const createFilterResult =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          operation_type: "create" as const,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(createFilterResult);
  const updateFilterResult =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          operation_type: "update" as const,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(updateFilterResult);
  // 6. 测试4: 按投票类型筛选
  const upvoteFilterResult =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          vote_type: "upvote" as const,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(upvoteFilterResult);
  const downvoteFilterResult =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          vote_type: "downvote" as const,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(downvoteFilterResult);
  // 7. 测试5: 按karma影响筛选
  const karma1FilterResult =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          karma_impact: 1,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(karma1FilterResult);
  const karmaNeg1FilterResult =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          karma_impact: -1,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(karmaNeg1FilterResult);
  // 8. 测试6: 按日期范围筛选
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1天前
  const endDate = new Date().toISOString();
  const dateFilterResult =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(dateFilterResult);
  // 9. 测试7: 分页
  const paginationResult =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginationResult.data.length <= 2,
  );
  // 10. 测试8: 组合筛选
  if (emptyFilterResult.data.length > 0) {
    // 使用已知的有效值进行组合筛选
    const combinedFilterResult =
      await api.functional.communityPlatform.moderator.voting_transactions.index(
        moderatorConnection,
        {
          body: {
            user_id: user1.id,
            operation_type: "create" as const,
            vote_type: "upvote" as const,
            karma_impact: 1,
          } satisfies ICommunityPlatformVotingTransaction.IRequest,
        },
      );
    typia.assert(combinedFilterResult);
    // 验证响应结构
    for (const transaction of combinedFilterResult.data) {
      typia.assert(transaction);
      TestValidator.predicate(
        "transaction has required fields",
        transaction.id !== undefined &&
          transaction.operation_type !== undefined &&
          transaction.vote_type !== undefined &&
          transaction.karma_impact !== undefined &&
          transaction.transaction_timestamp !== undefined &&
          transaction.user.id !== undefined,
      );
    }
  }
}
