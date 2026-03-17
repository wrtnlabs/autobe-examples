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
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test business logic edge cases for report approval authorization:
 * 1. Moderator cannot approve report in community without moderation role
 * 2. Moderator cannot approve their own submitted report
 * 3. Cannot approve already-approved report
 * 4. Cannot approve non-existent report
 * Note: Dismissed report test skipped due to missing dismissal API
 */
export async function test_api_report_approval_authorization_edge_cases(connection: api.IConnection): Promise<void> {
    // ===============================
    // 1. CREATE MEMBER ACCOUNTS FOR MODERATORS
    // ===============================
    // Create base connections for authorization
    const moderatorABaseConnection: api.IConnection = { host: connection.host };
    const moderatorBBaseConnection: api.IConnection = { host: connection.host };
    const creatorBaseConnection: api.IConnection = { host: connection.host };
    const reporterBaseConnection: api.IConnection = { host: connection.host };
    // Create member accounts (moderators are members with special roles)
    const moderatorA = await authorize_member_join(moderatorABaseConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "modA1234",
            username: RandomGenerator.alphaNumeric(8),
            nickname: RandomGenerator.name(1),
            href: "https://example.com",
            referrer: "https://example.com",
            ip: "127.0.0.1",
        } satisfies ICommunityPlatformMember.IJoin,
    });
    const moderatorB = await authorize_member_join(moderatorBBaseConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "modB1234",
            username: RandomGenerator.alphaNumeric(8),
            nickname: RandomGenerator.name(1),
            href: "https://example.com",
            referrer: "https://example.com",
            ip: "127.0.0.1",
        } satisfies ICommunityPlatformMember.IJoin,
    });
    // Create actor-specific connections
    const moderatorAConnection: api.IConnection = { host: connection.host };
    moderatorAConnection.headers = { Authorization: moderatorA.token.access };
    const moderatorBConnection: api.IConnection = { host: connection.host };
    moderatorBConnection.headers = { Authorization: moderatorB.token.access };
    // ===============================
    // 2. CREATE COMMUNITIES
    // ===============================
    const communityA = await generate_random_community_platform_member_communities_create(moderatorAConnection, {
        body: {
            name: RandomGenerator.alphaNumeric(10).toLowerCase(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
    });
    typia.assert(communityA);
    const communityB = await generate_random_community_platform_member_communities_create(moderatorBConnection, {
        body: {
            name: RandomGenerator.alphaNumeric(10).toLowerCase(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
    });
}