import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_reports_create } from "../../../generate/generate_random_community_member_communities_reports_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

export async function test_api_report_approve_post_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the community owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuthorized);
  // Step 2: Owner creates a new community (auto-assigned 'owner' moderator role)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Owner subscribes to the community (prerequisite to create posts)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      ownerConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // Step 4: Owner creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Register a second member (reporter)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuthorized = await authorize_member_join(reporterConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(reporterAuthorized);
  // Step 6: Reporter submits a content report targeting the post
  const reportReason = RandomGenerator.paragraph({ sentences: 3 });
  const report =
    await generate_random_community_member_communities_reports_create(
      reporterConnection,
      {
        params: { communityId: community.id },
        body: {
          post_id: post.id,
          reason: reportReason,
        },
      },
    );
  typia.assert(report);
  // Verify initial report state is 'pending'
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  TestValidator.equals("initial resolver is null", report.resolver, null);
  // Test execution: Owner approves the report
  const resolvedReport =
    await api.functional.community.member.communities.reports.resolve(
      ownerConnection,
      {
        communityId: community.id,
        reportId: report.id,
        body: { status: "approved" } satisfies ICommunityReport.IUpdate,
      },
    );
  typia.assert(resolvedReport);
  // Validate the resolved report response
  TestValidator.equals(
    "report status is approved",
    resolvedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "resolver is non-null",
    resolvedReport.resolver !== null,
  );
  TestValidator.equals(
    "resolver is the owner",
    resolvedReport.resolver!.id,
    ownerAuthorized.id,
  );
  TestValidator.predicate(
    "post field is non-null",
    resolvedReport.post !== null,
  );
  TestValidator.equals("comment field is null", resolvedReport.comment, null);
  TestValidator.equals(
    "reporter identity matches",
    resolvedReport.reporter.id,
    reporterAuthorized.id,
  );
  TestValidator.equals(
    "reason matches original",
    resolvedReport.reason,
    reportReason,
  );
  TestValidator.predicate(
    "updated_at is not before created_at",
    new Date(resolvedReport.updated_at) >= new Date(resolvedReport.created_at),
  );
  // Business rule: report is now in terminal state — further resolution must fail (409)
  await TestValidator.error(
    "cannot re-resolve already-approved report",
    async () => {
      await api.functional.community.member.communities.reports.resolve(
        ownerConnection,
        {
          communityId: community.id,
          reportId: report.id,
          body: { status: "dismissed" } satisfies ICommunityReport.IUpdate,
        },
      );
    },
  );
}
