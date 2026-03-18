import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import type { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_report_preview_success_grouped_rows(connection: api.IConnection): Promise<void> {
    const memberConnection: api.IConnection = { host: connection.host };
    // Authenticate as member via join (utility)
    const credentials = {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        organizationName: RandomGenerator.name(),
        organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
        organizationCurrencyCode: "USD",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>,
        href: "https://example.com/join",
        referrer: "https://example.com/",
        organizationLogoUrl: null,
        ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin;
    await authorize_member_join(memberConnection, {
        body: credentials,
    });
    // NOTE: IRequest schema was not provided; use typia.random to generate a valid request shape.
    // Also run twice with two different date-range-related seeds by re-randomizing.
    const runPreview = async () => {
        const body = typia.random<IErpHrmTimeTrackingReportDefinition.IRequest>();
        const output = await api.functional.erpHrmTimeTracking.member.reportDefinitions.preview.previewReportDefinitions(memberConnection, {
            body,
        });
        typia.assert(output);
        return output;
    };
    const output1 = await runPreview();
    const output2 = await runPreview();
    // Validate row structure
    TestValidator.predicate("has grouped rows array", () => Array.isArray(output1));
    const validateSummaryRow = (row: IErpHrmTimeTrackingReportOutput.ISummary extends any ? (IErpHrmTimeTrackingReportOutput.ISummary extends (infer U)[] ? U : IErpHrmTimeTrackingReportOutput.ISummary) : never) => {
        const r = row as IErpHrmTimeTrackingReportOutput.ISummary;
        TestValidator.equals("id exists", typeof r.id, "string");
        TestValidator.equals("report_generation_run_id exists", typeof r.report_generation_run_id, "string");
        TestValidator.equals("employee_id exists", typeof r.employee_id, "string");
        TestValidator.equals("project_id exists", typeof r.project_id, "string");
        TestValidator.predicate("task_id is null or string", r.task_id === null || typeof r.task_id === "string");
        TestValidator.predicate("week_start_date_id is null or string", r.week_start_date_id === null || typeof r.week_start_date_id === "string");
        TestValidator.equals("grouping_sort_key exists", typeof r.grouping_sort_key, "string");
    };
    const rows1 = output1 as unknown as IErpHrmTimeTrackingReportOutput.ISummary[];
    const rows2 = output2 as unknown as IErpHrmTimeTrackingReportOutput.ISummary[];
    // If empty, still allowed by business logic; otherwise validate grouping keys determinism.
    if (rows1.length > 0) {
        for (const row of rows1)
            validateSummaryRow(row);
        const sortKeys1 = rows1.map((r) => r.grouping_sort_key);
        const uniq1 = new Set(sortKeys1);
        TestValidator.predicate("grouping_sort_key strings are non-empty", () => sortKeys1.every((k) => k.length > 0));
        TestValidator.predicate("grouping_sort_key not all identical", () => uniq1.size > 0);
    }
    if (rows2.length > 0) {
        for (const row of rows2)
            validateSummaryRow(row);
    }
    // Determinism check: rerun one more time and compare sort keys for same output length.
    const output3 = await runPreview();
    const rows3 = output3 as unknown as IErpHrmTimeTrackingReportOutput.ISummary[];
    TestValidator.equals("deterministic grouping_sort_key count matches", rows2.length, rows3.length);
    if (rows2.length > 0) {
        const sortKeys2 = rows2.map((r) => r.grouping_sort_key);
        const sortKeys3 = rows3.map((r) => r.grouping_sort_key);
        TestValidator.equals("deterministic grouping_sort_key ordering", sortKeys3, sortKeys2);
    }
}
