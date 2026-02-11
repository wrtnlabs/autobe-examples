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
export async function test_api_report_update_approved(connection: api.IConnection): Promise<void> {
    // Admin account setup
    const adminJoinBody = {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
    };
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, { body: adminJoinBody });
    // Login as admin
    await authorize_admin_login(adminConnection, { body: { email: adminJoinBody.email, password: adminJoinBody.password } });
    // Member setup
    const memberJoinBody = {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
    };
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, { body: memberJoinBody });
    await authorize_member_login(memberConnection, { body: { email: memberJoinBody.email, password: memberJoinBody.password } });
    // Create report as member
    const report = await generate_random_community_member_reports_create(memberConnection, { body: {} });
    // Update report as admin
    const updatedReport = await api.functional.community.admin.reports.update(adminConnection, {
        reportId: report.id,
        body: {
            status: "approved",
            reason: RandomGenerator.paragraph({ sentences: 1 }) satisfies string & tags.MinLength<5>,
        },
    });
    typia.assert(updatedReport);
    // Verify report status is approved
    TestValidator.equals("report status", updatedReport.status, "approved");
}