import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReportsResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportsResolution";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_moderation_reports_resolution } from "../../../prepare/prepare_random_community_platform_moderation_reports_resolution";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_admin_reports_resolutions_create } from "../../../generate/generate_random_community_platform_admin_reports_resolutions_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_report_resolution_escalated(connection: api.IConnection): Promise<void> {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123$",
            name: RandomGenerator.name()
        } satisfies ICommunityPlatformMember.IJoin
    });
    const testReport = await generate_random_community_platform_member_reports_create(memberConnection, {
        body: {
            report_categories_id: typia.random<string & tags.Format<"uuid">>(),
            reason: RandomGenerator.paragraph({ sentences: 2 }) satisfies string & tags.MinLength<10> & tags.MaxLength<500>,
            reported_content_type: "post",
            reported_content_id: typia.random<string & tags.Format<"uuid">>()
        }
    });
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_login(adminConnection, {
        body: {} satisfies ICommunityPlatformAdmin.ILogin
    });
    const escalatedResolution = await generate_random_community_platform_admin_reports_resolutions_create(adminConnection, {
        body: {} satisfies ICommunityPlatformModerationReportsResolution.ICreate,
        params: {
            reportId: testReport.id
        }
    });
    typia.assert(escalatedResolution);
    TestValidator.equals("action should be escalated", escalatedResolution.action, "escalated");
    TestValidator.predicate("escalation reason recorded", escalatedResolution.resolution_reason !== null);
}