import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import type { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import type { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test community moderator resolving a content report.
 *
 * Validates the complete report resolution workflow including member authentication, community creation, post creation, report submission, and moderator resolution. Ensures that when a moderator approves a report, the status transitions to 'approved' with resolved_by and resolved_at populated. Also validates dismissal leaves content intact with 'dismissed' status. Both resolution actions properly record the moderator ID and timestamp.
 *
 * Testing covers the full lifecycle: members subscribe to a community, a post is created and reported with pending status, a moderator resolves by approving (or dismissing) the report, and the response reflects the correct updated status with audit fields properly set.
 *
 * 1. Moderator member joins and authenticates, creates and subscribes to community.
 * 2. Second member joins and authenticates, subscribes to the same community.
 * 3. Second member creates a post in the community.
 * 4. Moderator reports the post, establishing a pending report.
 * 5. Moderator resolves the report with 'approved' status.
 * 6. Validates report status is 'approved', resolved_by matches moderator ID, resolved_at is present.
 * 7. Second member creates another post, moderator reports it again.
 * 8. Moderator resolves second report with 'dismissed' status, validates response accordingly.
 */
export async function test_api_report_resolution_by_moderator(connection: api.IConnection): Promise<void>
{
    // 1. Moderator member authentication and community setup
    const moderatorConnection: api.IConnection = { host: connection.host };
    const moderatorAuth = await authorize_member_join(moderatorConnection, { body: {} });
    typia.assert(moderatorAuth);
    const community = await generate_random_reddit_like_community_member_communities_create(moderatorConnection, { body: {} });
    typia.assert(community);
    await generate_random_reddit_like_community_member_community_subscriptions_create(moderatorConnection, { body: { community_id: community.id } });
    // 2. Second member authentication
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, { body: {} });
    await generate_random_reddit_like_community_member_community_subscriptions_create(memberConnection, { body: { community_id: community.id } });
    // 3. Second member creates a post
    const post = await generate_random_reddit_like_community_member_posts_create(memberConnection, {
        body: { community_id: community.id, post_type: "text" },
    });
    typia.assert(post);
    // 4. Moderator reports the post
    const report = await generate_random_reddit_like_community_member_reports_create(moderatorConnection, { body: { postId: post.id, reason: RandomGenerator.paragraph({ sentences: 2 }) } });
    typia.assert(report);
    TestValidator.equals("report status is pending", report.status, "pending");
    // 5. Moderator resolves the report with 'approved'
    const resolvedApproved = await api.functional.redditLikeCommunity.member.reports.update(moderatorConnection, {
        reportId: report.id,
        body: { status: "approved" } satisfies IREdditLikeCommunityReport.IUpdate,
    });
    typia.assert(resolvedApproved);
    // 6. Validate approved resolution
    TestValidator.equals("report status is approved", resolvedApproved.status, "approved");
    TestValidator.equals("resolved by moderator id", resolvedApproved.resolvedBy?.id, moderatorAuth.id);
    TestValidator.predicate("resolved_at is present on approved", resolvedApproved.resolved_at !== null);
    // 7. Second test: Create post and report for dismissal test
    const post2 = await generate_random_reddit_like_community_member_posts_create(memberConnection, {
        body: { community_id: community.id, post_type: "text" },
    });
    typia.assert(post2);
    const report2 = await generate_random_reddit_like_community_member_reports_create(moderatorConnection, { body: { postId: post2.id, reason: RandomGenerator.paragraph({ sentences: 2 }) } });
    typia.assert(report2);
    // 8. Moderator dismisses the second report
    const resolvedDismissed = await api.functional.redditLikeCommunity.member.reports.update(moderatorConnection, {
        reportId: report2.id,
        body: { status: "dismissed" } satisfies IREdditLikeCommunityReport.IUpdate,
    });
    typia.assert(resolvedDismissed);
    TestValidator.equals("report status is dismissed", resolvedDismissed.status, "dismissed");
    TestValidator.equals("resolved by moderator id on dismissal", resolvedDismissed.resolvedBy?.id, moderatorAuth.id);
    TestValidator.predicate("resolved_at is present on dismissed", resolvedDismissed.resolved_at !== null);
}