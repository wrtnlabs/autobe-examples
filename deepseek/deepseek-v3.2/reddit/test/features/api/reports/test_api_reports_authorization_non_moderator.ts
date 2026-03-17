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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test authorization failure when non-moderator attempts to retrieve report details.
 * As a reporter, submit a report against a post. As a regular member without
 * moderation privileges in the community, attempt to retrieve the report details.
 * Expect 403 Forbidden error because the operation requires moderator privileges.
 * Verify the system correctly validates that the requesting user has appropriate
 * moderation authority in the report's community.
 */
export async function test_api_reports_authorization_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Author setup (content creator who creates community, post, comment)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Create community (author becomes owner automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Author subscribes to their own community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Author creates a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Author writes a comment on the post (not used for reporting but part of scenario)
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Reporter setup (different member who will report the post)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // Note: Reporter does NOT need to subscribe to community to submit a report
  // Reporting is allowed as long as reporter is not banned from the community
  // 7. Reporter submits a report against the post
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        postId: post.id,
      } satisfies ICommunityPlatformContentReport.ICreate,
    },
  );
  typia.assert(report);
  // 8. Non-moderator member setup (regular member without moderation privileges)
  // Must be different from both author and reporter
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModerator = await authorize_member_join(nonModeratorConnection, {});
  typia.assert(nonModerator);
  // Verify non-moderator is NOT subscribed to the community (truly non-moderator)
  // Non-moderator should not be community owner, moderator, or reporter
  TestValidator.notEquals(
    "non-moderator different from author",
    nonModerator.id,
    author.id,
  );
  TestValidator.notEquals(
    "non-moderator different from reporter",
    nonModerator.id,
    reporter.id,
  );
  // 9. Attempt to retrieve report details using non-moderator connection - expect 403 Forbidden
  await TestValidator.error(
    "non-moderator cannot retrieve report details",
    async () => {
      await api.functional.communityPlatform.member.reports.at(
        nonModeratorConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
  // 10. Verify moderator (community owner) CAN retrieve the report
  // Author is community owner and has moderator privileges
  const moderatorReport =
    await api.functional.communityPlatform.member.reports.at(authorConnection, {
      reportId: report.id,
    });
  typia.assert(moderatorReport);
  TestValidator.equals(
    "moderator can retrieve report",
    moderatorReport.id,
    report.id,
  );
}
