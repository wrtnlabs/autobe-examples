import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";
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
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_audit_reports_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Step 2: Create users to generate audit data
  const userConnections: api.IConnection[] = [];
  const userIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    const userCredentials = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin;
    const userAuth = await authorize_user_join(userConnection, {
      body: userCredentials,
    });
    userIds.push(userAuth.id);
    userConnections.push(userConnection);
  }
  // Step 3: Generate audit data through various actions
  const postIds: string[] = [];
  const commentIds: string[] = [];
  // User 1 creates a post
  const post1 = await generate_random_community_platform_user_posts_create(
    userConnections[0],
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "test",
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post1);
  postIds.push(post1.id);
  // User 2 votes on the post
  const vote1 =
    await generate_random_community_platform_user_posts_votes_create(
      userConnections[1],
      {
        params: { postId: post1.id },
        body: { vote_type: "upvote" },
      },
    );
  typia.assert(vote1);
  // User 3 comments on the post
  const comment1 =
    await generate_random_community_platform_user_posts_comments_create(
      userConnections[2],
      {
        params: { postId: post1.id },
        body: { content: RandomGenerator.paragraph({ sentences: 3 }) },
      },
    );
  typia.assert(comment1);
  commentIds.push(comment1.id);
  // Additional action: User 2 creates another post
  const post2 = await generate_random_community_platform_user_posts_create(
    userConnections[1],
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "test",
        post_type: "link",
        link_url: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(post2);
  postIds.push(post2.id);
  // Give some time for audit logs to be recorded
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Step 4: Query audit reports with various filter criteria
  // Test 1: Basic query with actor_type filter
  const query1 = {
    actor_type: "user",
  } satisfies ICommunityPlatformAuditLog.IRequest;
  const result1 =
    await api.functional.communityPlatform.admin.audit_reports.index(
      adminConnection,
      { body: query1 },
    );
  typia.assert(result1);
  TestValidator.predicate(
    "returns user actor results",
    result1.data.length > 0,
  );
  TestValidator.predicate(
    "all results are user actors",
    result1.data.every((item) => item.actor_type === "user"),
  );
  // Test 2: Filter by action_type
  const query2 = {
    action_type: "create_post",
  } satisfies ICommunityPlatformAuditLog.IRequest;
  const result2 =
    await api.functional.communityPlatform.admin.audit_reports.index(
      adminConnection,
      { body: query2 },
    );
  typia.assert(result2);
  if (result2.data.length > 0) {
    TestValidator.predicate(
      "all results are create_post actions",
      result2.data.every((item) => item.action_type === "create_post"),
    );
  }
  // Test 3: Filter by success status
  const query3 = {
    success: true,
  } satisfies ICommunityPlatformAuditLog.IRequest;
  const result3 =
    await api.functional.communityPlatform.admin.audit_reports.index(
      adminConnection,
      { body: query3 },
    );
  typia.assert(result3);
  TestValidator.predicate(
    "all results are successful actions",
    result3.data.every((item) => item.success === true),
  );
  // Test 4: Combined filters
  const query4 = {
    actor_type: "user",
    action_type: "vote",
    success: true,
  } satisfies ICommunityPlatformAuditLog.IRequest;
  const result4 =
    await api.functional.communityPlatform.admin.audit_reports.index(
      adminConnection,
      { body: query4 },
    );
  typia.assert(result4);
  if (result4.data.length > 0) {
    TestValidator.predicate(
      "combined filter matches all criteria",
      result4.data.every(
        (item) =>
          item.actor_type === "user" &&
          item.action_type === "vote" &&
          item.success === true,
      ),
    );
  }
  // Test 5: Filter by entity references (post_id)
  const query5 = {
    post_id: post1.id satisfies string & tags.Format<"uuid"> as string &
      tags.Format<"uuid">,
  } satisfies ICommunityPlatformAuditLog.IRequest;
  const result5 =
    await api.functional.communityPlatform.admin.audit_reports.index(
      adminConnection,
      { body: query5 },
    );
  typia.assert(result5);
  // Test 6: Pagination test with small page size
  const query6 = {
    page: 1,
    limit: 2,
  } satisfies ICommunityPlatformAuditLog.IRequest;
  const result6 =
    await api.functional.communityPlatform.admin.audit_reports.index(
      adminConnection,
      { body: query6 },
    );
  typia.assert(result6);
  TestValidator.predicate(
    "pagination shows correct page",
    result6.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination shows correct limit",
    result6.pagination.limit === 2,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    result6.data.length <= 2,
  );
  // Test 7: Verify ordering by timestamp
  const query7 = {
    limit: 10,
  } satisfies ICommunityPlatformAuditLog.IRequest;
  const result7 =
    await api.functional.communityPlatform.admin.audit_reports.index(
      adminConnection,
      { body: query7 },
    );
  typia.assert(result7);
  if (result7.data.length > 1) {
    for (let i = 0; i < result7.data.length - 1; i++) {
      const current = new Date(result7.data[i].created_at).getTime();
      const next = new Date(result7.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `item ${i} should be newer than or equal to item ${i + 1}`,
        current >= next,
      );
    }
  }
  // Test 8: Empty result set with unlikely filters
  const query8 = {
    actor_type: "non_existent_actor",
    action_type: "non_existent_action",
  } satisfies ICommunityPlatformAuditLog.IRequest;
  const result8 =
    await api.functional.communityPlatform.admin.audit_reports.index(
      adminConnection,
      { body: query8 },
    );
  typia.assert(result8);
  TestValidator.predicate(
    "returns empty result for impossible filter",
    result8.data.length === 0,
  );
  // Step 5: Validate authorization - non-admin should not have access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedQuery = {} satisfies ICommunityPlatformAuditLog.IRequest;
  await TestValidator.error(
    "non-admin cannot access audit reports",
    async () => {
      await api.functional.communityPlatform.admin.audit_reports.index(
        unauthorizedConnection,
        {
          body: unauthorizedQuery,
        },
      );
    },
  );
}
