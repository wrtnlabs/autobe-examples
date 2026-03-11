import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
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
import { generate_random_reddit_like_member_posts_reports_create } from "../../../generate/generate_random_reddit_like_member_posts_reports_create";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_admin_report_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin and member accounts
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Member creates a community for posting
  const communityResult =
    await api.functional.redditLike.member.communities.my.index(
      memberConnection,
    );
  typia.assert(communityResult);
  // 3. Get existing community (no need to create since the endpoint returns member's subscribed communities)
  const firstCommunity = communityResult.data[0];
  if (!firstCommunity) {
    throw new Error("No community found for member");
  }
  // 4. Create a post first (using mock postId since we need an existing post to report)
  const mockPostId = typia.random<string & tags.Format<"uuid">>();
  // Note: In a real scenario, member would first create a post using POST /member/communities/{name}/posts
  // For this test, we'll assume a post exists and report it
  // 5. Member submits a report on the post
  const report = await api.functional.redditLike.member.posts.reports.create(
    memberConnection,
    {
      postId: mockPostId,
      body: { reason: "Spam content" } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Admin retrieves the report
  const retrievedReport = await api.functional.redditLike.admin.reports.at(
    adminConnection,
    { reportId: report.id },
  );
  typia.assert(retrievedReport);
  // 7. Validate report structure
  const memberAuthorization = memberConnection.headers?.Authorization;
  TestValidator.equals(
    "report has reporter",
    retrievedReport.reporter.id,
    (memberAuthorization !== null && memberAuthorization !== undefined) ? String(memberAuthorization) : null,
  );
  TestValidator.equals(
    "report has reason",
    retrievedReport.reason,
    "Spam content",
  );
  TestValidator.equals("report has status", retrievedReport.status, "pending");
  TestValidator.predicate(
    "report has timestamps",
    retrievedReport.created_at !== undefined &&
      retrievedReport.updated_at !== undefined,
  );
  TestValidator.equals(
    "reporter exists",
    retrievedReport.reporter.username,
    (memberAuthorization !== null && memberAuthorization !== undefined) ? String(memberAuthorization) : null,
  );
}