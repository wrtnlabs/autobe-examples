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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

/**
 * Test that a community moderator can retrieve prioritized pending reports for their moderated communities.
 * Setup: create member as moderator, create second member as reporter, create community,
 * assign moderation role, create post, create report against post.
 * Then call priority endpoint with status filter set to pending.
 * Validate: response contains paginated list with at least one report, reports are filtered
 * to pending status only, each report shows reason, reporter info, community context.
 * Verify that older reports appear first in priority order.
 * Verify that only reports from the moderator's community are visible.
 */
export async function test_api_reports_priority_moderator_pending_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderator);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Assign moderation role (moderator is owner, can assign themselves as moderator)
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: moderator.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderationRole);
  // 4. Reporter setup
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(reporter);
  // 5. Create post in community (reporter needs to subscribe first? Not needed for moderation)
  const post = await generate_random_community_platform_member_posts_create(
    reporterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create report against the post
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        postId: post.id,
        commentId: null,
      } satisfies ICommunityPlatformContentReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Call priority reports endpoint
  const priorityRequest: ICommunityPlatformContentReport.IRequest = {
    status: ["pending"],
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    community_id: community.id,
  };
  const priorityResult =
    await api.functional.communityPlatform.member.reports.priority.index(
      moderatorConnection,
      { body: priorityRequest },
    );
  typia.assert(priorityResult);
  // 8. Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    typeof priorityResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "has pagination fields",
    () =>
      "current" in priorityResult.pagination &&
      "limit" in priorityResult.pagination &&
      "records" in priorityResult.pagination &&
      "pages" in priorityResult.pagination,
  );
  TestValidator.predicate(
    "has at least one report",
    () => priorityResult.data.length > 0,
  );
  // 9. Validate all reports have status 'pending'
  for (const reportSummary of priorityResult.data) {
    TestValidator.equals(
      `report ${reportSummary.id} status is pending`,
      reportSummary.status,
      "pending",
    );
  }
  // 10. Validate each report contains required fields
  for (const reportSummary of priorityResult.data) {
    TestValidator.predicate(
      `report ${reportSummary.id} has reason`,
      () => reportSummary.reason.length > 0,
    );
    TestValidator.predicate(
      `report ${reportSummary.id} has reporter`,
      () => typeof reportSummary.reporter === "object",
    );
    TestValidator.predicate(
      `report ${reportSummary.id} has community`,
      () => typeof reportSummary.community === "object",
    );
    TestValidator.equals(
      `report ${reportSummary.id} community matches`,
      reportSummary.community.id,
      community.id,
    );
  }
  // 11. Verify reports are sorted by created_at ascending (older first) for priority
  if (priorityResult.data.length > 1) {
    for (let i = 1; i < priorityResult.data.length; i++) {
      const prevDate = new Date(priorityResult.data[i - 1].created_at);
      const currDate = new Date(priorityResult.data[i].created_at);
      TestValidator.predicate(
        `reports sorted by created_at ascending at index ${i}`,
        () => prevDate <= currDate,
      );
    }
  }
  // 12. Verify only reports from moderator's community appear
  for (const reportSummary of priorityResult.data) {
    TestValidator.equals(
      `report ${reportSummary.id} belongs to moderator's community`,
      reportSummary.community.id,
      community.id,
    );
  }
}
