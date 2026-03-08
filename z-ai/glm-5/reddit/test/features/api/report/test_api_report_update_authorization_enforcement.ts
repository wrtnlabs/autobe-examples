import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_update_authorization_enforcement(
    connection: api.IConnection,
): Promise<void> {
    // 1. Member A joins and creates a community (becomes owner/moderator)
    const memberAConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberAConnection, {});
    const community = await generate_random_community_platform_member_communities_create(memberAConnection, {});
    typia.assert(community);

    // 2. Member B joins, subscribes, creates a post, and reports it
    const memberBConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberBConnection, {});

    // Member B subscribes to the community
    const subscription = await generate_random_community_platform_member_subscriptions_create(memberBConnection, {
        body: {
            community_id: community.id,
        },
    });
    typia.assert(subscription);

    // Member B creates a post
    const post = await generate_random_community_platform_member_posts_create(memberBConnection, {
        body: {
            communityId: community.id,
            title: "Test post for reporting",
            contentType: "text",
            textContent: "This is a test post that will be reported for moderation testing.",
            linkUrl: null,
            imageUrl: null,
        },
    });
    typia.assert(post);

    // Member B reports the post
    const report = await generate_random_community_platform_member_reports_create(memberBConnection, {
        body: {
            reason: "This post contains content that may violate community guidelines for testing purposes.",
            communityId: community.id,
            postId: post.id,
        },
    });
    typia.assert(report);

    // Store original report state for comparison
    const originalReportId = report.id;

    // 3. Member C joins (not a moderator)
    const memberCConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberCConnection, {});

    // 4. Member C attempts to update the report (should fail with 403)
    await TestValidator.httpError("non-moderator cannot update report", 403, async () =>
        await api.functional.communityPlatform.member.reports.update(memberCConnection, {
            reportId: originalReportId,
            body: {
                status: "approved",
            } satisfies ICommunityPlatformReport.IUpdate,
        }),
    );

    // 5. Member A (community owner/moderator) can successfully update the report
    const updatedReport = await api.functional.communityPlatform.member.reports.update(memberAConnection, {
        reportId: originalReportId,
        body: {
            status: "dismissed",
        } satisfies ICommunityPlatformReport.IUpdate,
    });
    typia.assert(updatedReport);

    // Verify the update was successful
    TestValidator.equals("report status updated by moderator", updatedReport.status, "dismissed");
    TestValidator.equals("report id preserved", updatedReport.id, originalReportId);
}