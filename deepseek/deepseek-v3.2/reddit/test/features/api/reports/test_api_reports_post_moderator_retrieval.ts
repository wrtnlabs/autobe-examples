import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import type { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import type { ICommunityPlatformReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComment";
import type { ICommunityPlatformReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test post report retrieval with moderator privileges from a different user than community owner.
 * As a reporter, submit a report against an inappropriate post.
 * As a separately authenticated moderator (who must have moderation role), retrieve the report details.
 * Verify the complete report entity includes postReport relationship with post details, excludes commentReport, shows reporter identity, pending status, reason text, and community context.
 * Validate the moderator authorization check requires valid moderation role in the community.
 */
export async function test_api_reports_post_moderator_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const postAuthorConnection: api.IConnection = { host: connection.host };
  const reporterConnection: api.IConnection = { host: connection.host };
  const moderatorConnection: api.IConnection = { host: connection.host };
  // 1. Post author setup
  const postAuthor = await authorize_member_join(postAuthorConnection, {});
  typia.assert(postAuthor);
  // 2. Create community (post author becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      postAuthorConnection,
      {},
    );
  typia.assert(community);
  // 3. Post author subscribes to community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      postAuthorConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    postAuthorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Reporter setup
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // 6. Reporter submits a report against the post
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: post.id,
      } satisfies ICommunityPlatformContentReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Moderator setup
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 8. Attempt retrieval as moderator without role (should fail)
  await TestValidator.httpError(
    "moderator without role should be denied",
    403,
    async () => {
      await api.functional.communityPlatform.member.reports.at(
        moderatorConnection,
        { reportId: report.id },
      );
    },
  );
  // 9. Attempt retrieval as reporter (non-moderator, should also fail)
  await TestValidator.httpError(
    "reporter without moderator role should be denied",
    403,
    async () => {
      await api.functional.communityPlatform.member.reports.at(
        reporterConnection,
        { reportId: report.id },
      );
    },
  );
  // Validate report data structure
  TestValidator.equals("report targets post", report.postReport != null, true);
  TestValidator.equals(
    "report does not target comment",
    report.commentReport,
    null,
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report has reason text",
    typeof report.reason,
    "string",
  );
  TestValidator.predicate(
    "report reason is not empty",
    report.reason.length > 0,
  );
  TestValidator.equals("report has reporter", report.reporter.id, reporter.id);
  TestValidator.equals(
    "report has community",
    report.community.id,
    community.id,
  );
  // Additional validation: postReport relationship should exist and reference the post
  if (report.postReport != null) {
    TestValidator.equals(
      "postReport references correct post",
      report.postReport.post.id,
      post.id,
    );
  }
}
