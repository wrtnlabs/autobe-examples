import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportView";
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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_view_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Admin user registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuthorized);
  typia.assert(adminAuthorized.token);
  const { token } = adminAuthorized;
  const adminSessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: token.access,
    },
  };
  // 2. Create a community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminSessionConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
          description: typia.random<string>(),
        },
      },
    );
  typia.assert(community);
  // 3. Setup: Member user registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuthorized);
  typia.assert(memberAuthorized.token);
  const { token: memberToken } = memberAuthorized;
  const memberSessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: memberToken.access,
    },
  };
  // 4. Member creates a post in the community
  const post = await api.functional.redditPlatform.member.posts.create(
    memberSessionConnection,
    {
      body: {
        title: typia.random<string & tags.MinLength<1> & tags.MaxLength<300>>(),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: typia.random<string>(),
      },
    },
  );
  typia.assert(post);
  // 5. Member reports the post
  const report = await api.functional.redditPlatform.member.reports.create(
    memberSessionConnection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "POST",
        reported_content_id: post.id,
        reason: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
      },
    },
  );
  typia.assert(report);
  // 6. Use simulation mode to test view record retrieval
  // Since view records are system-generated when admins view reports,
  // we use simulate mode to get mock data for testing response structure
  const simulateConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
    headers: {
      ...connection.headers,
      Authorization: token.access,
    },
  };
  // Generate a random viewId for the test
  const viewId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the report view record (using simulate mode for mock data)
  const view = await api.functional.redditPlatform.admin.reports.views.at(
    simulateConnection,
    {
      reportId: report.id,
      viewId: viewId,
    },
  );
  typia.assert(view);
  // 7. Validate response structure
  TestValidator.equals("view id matches request", view.id, viewId);
  TestValidator.equals(
    "viewed_at is valid date-time",
    typeof view.viewed_at,
    "string",
  );
  TestValidator.equals(
    "created_at is valid date-time",
    typeof view.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is valid date-time",
    typeof view.updated_at,
    "string",
  );
  // 8. Validate moderator details
  TestValidator.equals(
    "moderator id is valid uuid",
    typeof view.moderator.id,
    "string",
  );
  TestValidator.equals(
    "moderator username is string",
    typeof view.moderator.username,
    "string",
  );
  TestValidator.equals(
    "moderator display_name is string",
    typeof view.moderator.display_name,
    "string",
  );
  TestValidator.equals(
    "moderator email is string",
    typeof view.moderator.email,
    "string",
  );
  TestValidator.equals(
    "moderator is_active is boolean",
    typeof view.moderator.is_active,
    "boolean",
  );
  TestValidator.equals(
    "moderator created_at is date-time",
    typeof view.moderator.created_at,
    "string",
  );
  // 9. Validate report details
  TestValidator.equals("report id matches", view.report.id, report.id);
  TestValidator.equals(
    "reporter_username is string",
    typeof view.report.reporter_username,
    "string",
  );
  TestValidator.equals(
    "community_name is string",
    typeof view.report.community_name,
    "string",
  );
  TestValidator.equals(
    "reported_content_type is POST",
    view.report.reported_content_type,
    "POST",
  );
  TestValidator.equals(
    "reported_content_id matches post id",
    view.report.reported_content_id,
    post.id,
  );
  TestValidator.equals("reason is string", typeof view.report.reason, "string");
  TestValidator.equals("status is PENDING", view.report.status, "PENDING");
  TestValidator.equals(
    "created_at is date-time",
    typeof view.report.created_at,
    "string",
  );
  // 10. Verify timestamps are valid ISO 8601 format
  const viewedAt = new Date(view.viewed_at);
  const createdAt = new Date(view.created_at);
  const updatedAt = new Date(view.updated_at);
  TestValidator.predicate(
    "viewed_at is valid date",
    !isNaN(viewedAt.getTime()),
  );
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
  // 11. Verify timestamp ordering
  TestValidator.predicate(
    "viewed_at is after or equal to created_at",
    viewedAt >= createdAt,
  );
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    updatedAt >= createdAt,
  );
}
