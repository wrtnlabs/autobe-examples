import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_moderation_reports_viewing(connection: api.IConnection): Promise<void> {
    // 1. Create moderator member account
    const moderatorConnection: api.IConnection = { host: connection.host };
    const moderatorAuth = await authorize_member_join(moderatorConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(moderatorAuth);
    // 2. Create reporting member account
    const reporterConnection: api.IConnection = { host: connection.host };
    const reporterAuth = await authorize_member_join(reporterConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(reporterAuth);
    // 3. Retrieve reports for the moderator with specified page size
    const pageSize = typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>>();
    const reportsResponse = await api.functional.redditCommunity.member.moderation.reports.index(moderatorConnection, {
        body: {
            pageSize,
        },
    });
    typia.assert(reportsResponse);
    // 4. Validate response has valid pagination structure
    TestValidator.equals("pagination has valid current page (1-indexed)", reportsResponse.pagination.current, 1);
    TestValidator.equals("pagination limit matches requested page size", reportsResponse.pagination.limit, pageSize);
    TestValidator.equals("pagination records matches data array length", reportsResponse.pagination.records, reportsResponse.data.length);
    TestValidator.equals("pagination pages calculated correctly", reportsResponse.pagination.pages, Math.ceil(reportsResponse.pagination.records / reportsResponse.pagination.limit));
    // 5. Validate each report in the response
    if (reportsResponse.data.length > 0) {
        for (const report of reportsResponse.data) {
            // Validate reporter field exists and has required properties
            TestValidator.equals("report has reporter object", report.reporter !== null && report.reporter !== undefined, true);
            TestValidator.equals("reporter has valid uuid id", report.reporter.id !== "", true);
            TestValidator.equals("reporter has username", report.reporter.username !== "", true);
            TestValidator.equals("reporter has created_at timestamp", report.reporter.created_at !== "", true);
            // Validate community field exists and has required properties
            TestValidator.equals("report has community object", report.community !== null && report.community !== undefined, true);
            TestValidator.equals("community has valid uuid id", report.community.id !== "", true);
            TestValidator.equals("community has name", report.community.name !== "", true);
            // Validate target_type is post or comment
            TestValidator.equals("target_type is post or comment", report.target_type === "post" || report.target_type === "comment", true);
            // Validate target_id exists and is valid uuid
            TestValidator.equals("report has valid target_id", report.target_id !== "", true);
            // Validate reason exists and is not empty
            TestValidator.equals("report has reason text", report.reason !== "", true);
            // Validate status is pending, approved, or dismissed
            TestValidator.equals("status is pending, approved, or dismissed", report.status === "pending" ||
                report.status === "approved" ||
                report.status === "dismissed", true);
            // Validate timestamps exist and are valid date-time
            TestValidator.equals("report has created_at timestamp", report.created_at !== "", true);
            TestValidator.equals("report has updated_at timestamp", report.updated_at !== "", true);
        }
        // 6. Verify reports are sorted by created_at (newest first by default)
        if (reportsResponse.data.length > 1) {
            for (let i = 0; i < reportsResponse.data.length - 1; i++) {
                const currentReport = reportsResponse.data[i];
                const nextReport = reportsResponse.data[i + 1];
                TestValidator.predicate("reports sorted by created_at (newest first)", new Date(currentReport.created_at).getTime() >=
                    new Date(nextReport.created_at).getTime());
            }
        }
    }
}