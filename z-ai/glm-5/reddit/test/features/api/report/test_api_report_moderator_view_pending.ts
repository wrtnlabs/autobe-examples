import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_moderator_view_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner/moderator
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Create community (owner automatically becomes moderator)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Owner creates a post in their community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      ownerConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // 4. Create reporter (another member)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  // 5. Reporter creates a report against the post
  const reportReason = RandomGenerator.paragraph({ sentences: 3 });
  const createdReport =
    await generate_random_community_platform_member_reports_create(
      reporterConnection,
      {
        body: {
          community_id: community.id,
          target_type: "post",
          target_id: post.id,
          reason: reportReason,
        },
      },
    );
  typia.assert(createdReport);
  // 6. Moderator (owner) retrieves the report
  const retrievedReport =
    await api.functional.communityPlatform.member.reports.at(ownerConnection, {
      reportId: createdReport.id,
    });
  typia.assert(retrievedReport);
  // 7. Validate report status is pending
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
  // 8. Validate reporter information
  TestValidator.equals("reporter id", retrievedReport.member.id, reporter.id);
  TestValidator.equals(
    "reporter username",
    retrievedReport.member.username,
    reporter.username,
  );
  TestValidator.equals(
    "reporter display name",
    retrievedReport.member.displayName,
    reporter.displayName,
  );
  // 9. Validate target type and reason
  TestValidator.equals(
    "target type is post",
    retrievedReport.targetType,
    "post",
  );
  TestValidator.equals("reason matches", retrievedReport.reason, reportReason);
  // 10. Validate community reference
  TestValidator.equals(
    "community id",
    retrievedReport.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name",
    retrievedReport.community.name,
    community.name,
  );
  // 11. Validate target post is correctly referenced
  TestValidator.equals("target is a post", retrievedReport.targetType, "post");
  TestValidator.predicate(
    "target post id matches",
    retrievedReport.target.id === post.id,
  );
  // 12. Validate resolution fields are null for pending status
  TestValidator.equals("resolved_by is null", retrievedReport.resolvedBy, null);
  TestValidator.equals("resolved_at is null", retrievedReport.resolvedAt, null);
  // 13. Validate deleted_at is null (report is active)
  TestValidator.equals("deleted_at is null", retrievedReport.deletedAt, null);
}
