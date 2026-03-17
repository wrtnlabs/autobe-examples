import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";
import type { ICommunityPlatformUserReportHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReportHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserReportHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserReportHistory";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { prepare_random_community_platform_report_dismissal } from "../../../prepare/prepare_random_community_platform_report_dismissal";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_admin_reports_dismissals_create } from "../../../generate/generate_random_community_platform_admin_reports_dismissals_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_report_audit_history_multiple_actions(connection: api.IConnection): Promise<void> {
    // 1. Admin setup
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuthorized = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            href: "https://example.com",
            referrer: "https://referrer.com",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ICommunityPlatformAdmin.IJoin,
    });
    typia.assert(adminAuthorized);
    // 2. Member setup
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuthorized = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            username: RandomGenerator.alphaNumeric(10),
            nickname: RandomGenerator.name(),
            href: "https://example.com",
            referrer: "https://referrer.com",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ICommunityPlatformMember.IJoin,
    });
    typia.assert(memberAuthorized);
    // 3. Create community and subscribe
    const community = await generate_random_community_platform_member_communities_create(memberConnection, {
        body: {
            name: RandomGenerator.alphaNumeric(8),
            description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
    });
    typia.assert(community);
    const subscription = await generate_random_community_platform_member_subscriptions_create(memberConnection, {
        body: {
            community_id: community.id,
            active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
    });
    typia.assert(subscription);
    // 4. Create post
    const post = await generate_random_community_platform_member_posts_create(memberConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            community_name: community.name,
            content_type: "TEXT",
            content_text: {
                content: RandomGenerator.paragraph({ sentences: 3 }),
                formatting: "plain",
            } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
    });
    typia.assert(post);
    // 5. Submit report
    const report = await generate_random_community_platform_member_reports_create(memberConnection, {
        body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
            postId: post.id,
        } satisfies ICommunityPlatformContentReport.ICreate,
    });
    typia.assert(report);
    // 6. Admin dismisses report (main action for this report)
    const dismissal = await generate_random_community_platform_admin_reports_dismissals_create(adminConnection, {
        body: { notes: "Test dismissal notes" } satisfies ICommunityPlatformReportDismissal.ICreate,
        params: { reportId: report.id },
    });
    typia.assert(dismissal);
    // 7. Retrieve audit history
    const history = await api.functional.communityPlatform.admin.reports.history.index(adminConnection, { reportId: report.id });
    typia.assert(history);
    // 8. Validate audit trail has entries
    TestValidator.predicate("audit trail has entries", history.data.length >= 2);
    // Find created event
    const createdEvents = history.data.filter((entry) => entry.action_type === "created");
    TestValidator.predicate("has created event", createdEvents.length > 0);
    // Find dismissed event
    const dismissedEvents = history.data.filter((entry) => entry.action_type === "dismissed");
    TestValidator.predicate("has dismissed event", dismissedEvents.length > 0);
    // Check actor for created event
    const createdEvent = createdEvents[0];
    if (typeof createdEvent.actor !== "string") {
        TestValidator.equals("created by reporting member", createdEvent.actor.id, memberAuthorized.id);
    }
    // Check chronological order
    for (let i = 1; i < history.data.length; i++) {
        const prevDate = new Date(history.data[i - 1].created_at);
        const currDate = new Date(history.data[i].created_at);
        TestValidator.predicate(`entries ${i - 1} and ${i} chronological`, prevDate <= currDate);
    }
    // 9. Validate pagination structure
    TestValidator.predicate("has pagination", history.pagination !== undefined);
    TestValidator.predicate("pagination has current page", history.pagination.current >= 1);
    TestValidator.predicate("pagination has limit", history.pagination.limit > 0);
    TestValidator.predicate("pagination has records", history.pagination.records >= 0);
    TestValidator.predicate("pagination has pages", history.pagination.pages >= 1);
}