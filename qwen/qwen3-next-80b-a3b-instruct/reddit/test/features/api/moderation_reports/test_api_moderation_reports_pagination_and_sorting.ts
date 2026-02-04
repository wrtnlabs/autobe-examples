import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_moderation_reports_pagination_and_sorting(connection: api.IConnection): Promise<void> {
    // Step 1: Authenticate as owner
    const ownerConnection: api.IConnection = { host: connection.host };
    const owner: ICommunityPlatformOwner.IAuthorized = await authorize_owner_join(ownerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.MinLength<8>>(),
        },
    });
    typia.assert(owner);
    // Step 2: Query reports with limit=10 to test pagination and sorting
    const response1: IPageICommunityPlatformReport.ISummary = await api.functional.communityPlatform.owner.moderation.reports.index(ownerConnection, {
        body: {
            status: "pending",
            target_type: "post",
            limit: 10,
            page: 1
        } satisfies ICommunityPlatformReport.IRequest
    });
    typia.assert(response1);
    // Validate pagination metadata
    TestValidator.equals("limit 10 response - current page", response1.pagination.current, 1);
    TestValidator.equals("limit 10 response - limit", response1.pagination.limit, 10);
    TestValidator.predicate("limit 10 response - records >= 0", response1.pagination.records >= 0);
    TestValidator.equals("limit 10 response - pages calculation", response1.pagination.pages, Math.ceil(response1.pagination.records / 10));
    TestValidator.predicate("limit 10 response - data count <= 10", response1.data.length <= 10);
    // Step 3: Query reports with limit=20 to test pagination and sorting
    const response2: IPageICommunityPlatformReport.ISummary = await api.functional.communityPlatform.owner.moderation.reports.index(ownerConnection, {
        body: {
            status: "pending",
            target_type: "post",
            limit: 20,
            page: 1
        } satisfies ICommunityPlatformReport.IRequest
    });
    typia.assert(response2);
    // Validate pagination metadata
    TestValidator.equals("limit 20 response - current page", response2.pagination.current, 1);
    TestValidator.equals("limit 20 response - limit", response2.pagination.limit, 20);
    TestValidator.predicate("limit 20 response - records >= 0", response2.pagination.records >= 0);
    TestValidator.equals("limit 20 response - pages calculation", response2.pagination.pages, Math.ceil(response2.pagination.records / 20));
    TestValidator.predicate("limit 20 response - data count <= 20", response2.data.length <= 20);
    // Step 4: Validate sorting order (created_at descending) if any reports exist
    // Only validate sorting if we have at least 2 reports in the first response
    if (response1.data.length >= 2) {
        for (let i = 0; i < response1.data.length - 1; i++) {
            const current = new Date(response1.data[i].created_at);
            const next = new Date(response1.data[i + 1].created_at);
            TestValidator.predicate("reports sorted by created_at descending", current >= next);
        }
    }
    // Step 5: Validate limit parameter controls response size
    // Since we can't guarantee exactly how many reports exist, we validate that the limit affects the response data length
    TestValidator.predicate("limit 20 has more or equal data compared to limit 10", response2.data.length >= response1.data.length);
    // Step 6: Validate data structure consistency
    for (const report of [...response1.data, ...response2.data]) {
        TestValidator.predicate("report_id is uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(report.report_id));
        TestValidator.predicate("target_entity_id is uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(report.target_entity_id));
        TestValidator.predicate("target_type is valid", report.target_type === "post" || report.target_type === "comment");
        TestValidator.predicate("status is valid", report.status === "Pending" || report.status === "Approved" || report.status === "Dismissed");
        TestValidator.predicate("reporter_username is string", typeof report.reporter_username === "string");
        TestValidator.predicate("created_at is iso format", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/i.test(report.created_at));
    }
}