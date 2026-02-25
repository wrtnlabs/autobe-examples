import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingTransaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingTransaction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_voting_transactions_admin_filter_by_user_and_operation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Create multiple test users
  const users = await ArrayUtil.asyncRepeat(3, async (index) => {
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: `testuser${index}`,
        display_name: `Test User ${index}`,
      } satisfies ICommunityPlatformUser.IJoin,
    });
    return user;
  });
  // Generate voting transactions with different operation types
  // We'll use the same post ID for all votes to simulate different operations
  const postId = typia.random<string & tags.Format<"uuid">>();
  // User 0: Create upvote (create operation)
  const user0Connection: api.IConnection = { host: connection.host };
  // Use the connection from join which already has authentication
  const vote1 = await api.functional.communityPlatform.user.posts.votes.create(
    { host: connection.host, headers: { ...users[0].token } },
    {
      postId: postId,
      body: {
        vote_type: "upvote",
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(vote1);
  // User 0: Update vote to downvote (update operation)
  const vote2 = await api.functional.communityPlatform.user.posts.votes.create(
    { host: connection.host, headers: { ...users[0].token } },
    {
      postId: postId,
      body: {
        vote_type: "downvote",
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(vote2);
  // User 1: Create upvote (create operation)
  const vote3 = await api.functional.communityPlatform.user.posts.votes.create(
    { host: connection.host, headers: { ...users[1].token } },
    {
      postId: postId,
      body: {
        vote_type: "upvote",
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(vote3);
  // User 2: Create downvote (create operation)
  const vote4 = await api.functional.communityPlatform.user.posts.votes.create(
    { host: connection.host, headers: { ...users[2].token } },
    {
      postId: postId,
      body: {
        vote_type: "downvote",
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(vote4);
  // Test 1: Filter by user_id and operation_type "create"
  const filter1 =
    await api.functional.communityPlatform.admin.voting_transactions.index(
      adminConnection,
      {
        body: {
          user_id: users[0].id,
          operation_type: "create",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(filter1);
  // Should find at least one create operation for user 0
  TestValidator.predicate(
    "has create operations for user 0",
    filter1.data.length > 0,
  );
  // All results should belong to user 0 and be create operations
  for (const transaction of filter1.data) {
    TestValidator.equals(
      "user matches filter",
      transaction.user.id,
      users[0].id,
    );
    TestValidator.equals(
      "operation type matches filter",
      transaction.operation_type,
      "create",
    );
  }
  // Test 2: Filter by user_id and operation_type "update"
  const filter2 =
    await api.functional.communityPlatform.admin.voting_transactions.index(
      adminConnection,
      {
        body: {
          user_id: users[0].id,
          operation_type: "update",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(filter2);
  // Should find at least one update operation for user 0
  TestValidator.predicate(
    "has update operations for user 0",
    filter2.data.length > 0,
  );
  // All results should belong to user 0 and be update operations
  for (const transaction of filter2.data) {
    TestValidator.equals(
      "user matches filter",
      transaction.user.id,
      users[0].id,
    );
    TestValidator.equals(
      "operation type matches filter",
      transaction.operation_type,
      "update",
    );
  }
  // Test 3: Filter by user_id that has no transactions
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  const filter3 =
    await api.functional.communityPlatform.admin.voting_transactions.index(
      adminConnection,
      {
        body: {
          user_id: nonExistentUserId,
          operation_type: "create",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(filter3);
  // Should return empty results
  TestValidator.equals(
    "no transactions for non-existent user",
    filter3.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0",
    filter3.pagination.records,
    0,
  );
  // Test 4: Filter with combination that yields no results
  const filter4 =
    await api.functional.communityPlatform.admin.voting_transactions.index(
      adminConnection,
      {
        body: {
          user_id: users[1].id, // User 1 only has create operations
          operation_type: "update", // But we're filtering for update
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(filter4);
  // Should return empty results since user 1 has no update operations
  TestValidator.equals(
    "no update operations for user 1",
    filter4.data.length,
    0,
  );
  // Test 5: Verify user summary information is included
  const filter5 =
    await api.functional.communityPlatform.admin.voting_transactions.index(
      adminConnection,
      {
        body: {
          user_id: users[0].id,
          operation_type: "create",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(filter5);
  // Verify user summary contains expected fields
  for (const transaction of filter5.data) {
    TestValidator.predicate(
      "user summary has id",
      transaction.user.id !== undefined,
    );
    TestValidator.predicate(
      "user summary has username",
      transaction.user.username !== undefined,
    );
    TestValidator.predicate(
      "user summary has display_name",
      transaction.user.display_name !== null,
    );
    TestValidator.predicate(
      "user summary has karma",
      typeof transaction.user.karma === "number",
    );
    TestValidator.predicate(
      "user summary has created_at",
      transaction.user.created_at !== undefined,
    );
  }
  // Test 6: Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    filter5.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    filter5.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is valid",
    filter5.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    filter5.pagination.pages >= 0,
  );
}
