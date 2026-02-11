import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";
import { generate_random_community_member_reports_create } from "../../../generate/generate_random_community_member_reports_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_report_deletion_after_moderation(connection: api.IConnection): Promise<void> {
    // Create dedicated admin account with randomized credentials
    const adminEmail = typia.random<string & tags.Format<"email">>();
    const adminPassword = RandomGenerator.alphaNumeric(16);
    const adminConnection: api.IConnection = { host: connection.host };
    
    await authorize_admin_join(adminConnection, {
        body: {
            email: adminEmail,
            password: adminPassword,
            username: RandomGenerator.name(),
        } satisfies ICommunityAdmin.IJoin
    });
    
    // Authenticate as admin
    const adminLoginConnection: api.IConnection = { host: connection.host };
    
    await authorize_admin_login(adminLoginConnection, {
        body: {
            email: adminEmail,
            password: adminPassword,
        } satisfies ICommunityAdmin.ILogin
    });
    
    // Create member account with randomized credentials
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const memberPassword = RandomGenerator.alphaNumeric(16);
    const memberConnection: api.IConnection = { host: connection.host };
    
    await authorize_member_join(memberConnection, {
        body: {
            email: memberEmail,
            username: RandomGenerator.name(),
        } satisfies ICommunityMember.IJoin
    });
    
    // Authenticate as member
    const memberLoginConnection: api.IConnection = { host: connection.host };
    
    await authorize_member_login(memberLoginConnection, {
        body: {
            email: memberEmail,
            password: memberPassword,
        } satisfies ICommunityMember.ILogin
    });
    
    // Create valid report with minimum 5 character reason
    const report = await generate_random_community_member_reports_create(memberLoginConnection, {
        body: {
            reason: typia.random<string & tags.MinLength<5>>(),
        } satisfies DeepPartial<ICommunityReport>
    });
    
    // Delete the created report
    await api.functional.community.admin.reports.erase(adminLoginConnection, {
        reportId: report.id,
    });
}