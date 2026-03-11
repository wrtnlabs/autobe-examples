import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_reports_create } from "../../../generate/generate_random_reddit_like_member_posts_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_admin_global_report_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create first member
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(firstMember);
  // Create community and post as first member
  const community = await generate_random_reddit_like_member_communities_create(
    firstMemberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  const post = await generate_random_reddit_like_member_posts_create(
    firstMemberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 2. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1) + "_admin",
      displayName: RandomGenerator.name() + " Admin",
    } satisfies IRedditLikeAdmin.IJoin,
  });
  typia.assert(admin);
  // Login as admin with original credentials
  const adminLoginInput = {
    email: adminEmail,
    password: "1234",
  } satisfies IRedditLikeAdmin.ILogin;
  await authorize_admin_login(adminConnection, {
    body: adminLoginInput,
  });
  // 3. Submit report from second member
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1) + "_reporter",
      displayName: RandomGenerator.name() + " Reporter",
    } satisfies IRedditLikeMember.IJoin,
  });
  const report = await generate_random_reddit_like_member_posts_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
      params: { postId: post.id },
    },
  );
  typia.assert(report);
  // 4. Admin attempts to dismiss the report (global admin access)
  const updatedReport = await api.functional.redditLike.admin.reports.update(
    adminConnection,
    {
      reportId: report.id,
      body: {
        status: "dismissed",
      } satisfies IRedditLikeReport.IUpdate,
    },
  );
  typia.assert(updatedReport);
  // 5. Validate: Admin can manage report despite not being moderator
  TestValidator.equals(
    "report status updated to dismissed",
    updatedReport.status,
    "dismissed",
  );
  TestValidator.equals("report ID matches", updatedReport.id, report.id);
}
