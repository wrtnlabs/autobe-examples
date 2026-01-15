import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IComplianceRecordActionTaken } from "@ORGANIZATION/PROJECT-api/lib/structures/IComplianceRecordActionTaken";
import type { IComplianceRecordStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IComplianceRecordStatus";
import type { IComplianceRecordType } from "@ORGANIZATION/PROJECT-api/lib/structures/IComplianceRecordType";
import type { IDiscussionBoardComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComplianceRecord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComplianceRecord";
export async function test_api_compliance_audit_retrieval_by_status(connection: api.IConnection): Promise<void> {
    // Create a base connection for the test
    const baseConnection: api.IConnection = { host: connection.host };
    // Call the API endpoint to retrieve all compliance audit records
    const result = await api.functional.discussionBoard.audit.compliance.reports.index(baseConnection);
    typia.assert(result);
    // Validate the overall structure of the response
    TestValidator.equals("response contains pagination object", result.pagination !== undefined, true);
    // Validate pagination structure
    TestValidator.equals("pagination current is a positive integer", result.pagination.current >= 0, true);
    TestValidator.equals("pagination limit is a positive integer", result.pagination.limit > 0, true);
    TestValidator.equals("pagination records is a positive integer", result.pagination.records >= 0, true);
    TestValidator.equals("pagination pages is a positive integer", result.pagination.pages > 0, true);
    // Validate data array exists and is an array
    TestValidator.equals("response contains data array", Array.isArray(result.data), true);
    // Validate each compliance record has required fields with correct types
    result.data.forEach((record, index) => {
        TestValidator.equals(`record ${index} has valid UUID id`, typeof record.id === "string" && record.id.length > 0, true);
        TestValidator.equals(`record ${index} has valid record_type`, ["USER_REPORT", "MODERATOR_ACTION", "SYSTEM_TRIGGER", "APPEAL"].includes(record.record_type), true);
        if (record.reported_content_id !== undefined) {
            TestValidator.equals(`record ${index} has valid UUID reported_content_id`, typeof record.reported_content_id === "string" && record.reported_content_id.length > 0, true);
        }
        if (record.reporter_id !== undefined) {
            TestValidator.equals(`record ${index} has valid UUID reporter_id`, typeof record.reporter_id === "string" && record.reporter_id.length > 0, true);
        }
        if (record.moderator_id !== undefined) {
            TestValidator.equals(`record ${index} has valid UUID moderator_id`, typeof record.moderator_id === "string" && record.moderator_id.length > 0, true);
        }
        if (record.status !== undefined) {
            TestValidator.equals(`record ${index} has valid status`, ["PENDING_REVIEW", "RESOLVED", "APPEAL_PENDED", "APPEAL_REJECTED", "APPEAL_GRANTED"].includes(record.status), true);
        }
        if (record.violation_category !== undefined) {
            TestValidator.equals(`record ${index} has valid violation_category string`, typeof record.violation_category === "string", true);
        }
        if (record.violation_subcategory !== undefined) {
            TestValidator.equals(`record ${index} has valid violation_subcategory string`, typeof record.violation_subcategory === "string", true);
        }
        if (record.severity_level !== undefined) {
            TestValidator.equals(`record ${index} has valid severity_level integer between 1-5`, typeof record.severity_level === "number" &&
                record.severity_level >= 1 &&
                record.severity_level <= 5, true);
        }
        if (record.action_taken !== undefined) {
            TestValidator.equals(`record ${index} has valid action_taken`, ["NONE", "WARNING", "CONTENT_REMOVAL", "ACCOUNT_SUSPENSION", "ACCOUNT_BAN", "TRUST_SCORE_ADJUSTMENT"].includes(record.action_taken), true);
        }
        if (record.action_details !== undefined) {
            TestValidator.equals(`record ${index} has valid action_details string`, typeof record.action_details === "string", true);
        }
        TestValidator.equals(`record ${index} has valid timestamp in ISO format`, typeof record.timestamp === "string" && !isNaN(Date.parse(record.timestamp)), true);
        if (record.appeal_count !== undefined) {
            TestValidator.equals(`record ${index} has valid appeal_count integer between 0-10`, typeof record.appeal_count === "number" &&
                record.appeal_count >= 0 &&
                record.appeal_count <= 10, true);
        }
        if (record.related_report_ids !== undefined) {
            TestValidator.equals(`record ${index} has valid related_report_ids array`, Array.isArray(record.related_report_ids), true);
            record.related_report_ids.forEach((id, idx) => {
                TestValidator.equals(`record ${index} related_report_ids[${idx}] has valid UUID`, typeof id === "string" && id.length > 0, true);
            });
        }
        if (record.evidence_links !== undefined) {
            TestValidator.equals(`record ${index} has valid evidence_links array`, Array.isArray(record.evidence_links), true);
            record.evidence_links.forEach((link, idx) => {
                TestValidator.equals(`record ${index} evidence_links[${idx}] has valid URI`, typeof link === "string" && link.length > 0, true);
            });
        }
        if (record.policy_violated !== undefined) {
            TestValidator.equals(`record ${index} has valid policy_violated string`, typeof record.policy_violated === "string", true);
        }
        if (record.resolution_notes !== undefined) {
            TestValidator.equals(`record ${index} has valid resolution_notes string`, typeof record.resolution_notes === "string", true);
        }
    });
}