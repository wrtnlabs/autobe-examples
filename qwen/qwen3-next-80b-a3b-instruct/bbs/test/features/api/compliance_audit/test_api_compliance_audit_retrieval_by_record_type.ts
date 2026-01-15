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
export async function test_api_compliance_audit_retrieval_by_record_type(
  connection: api.IConnection,
): Promise<void> {
  // As per the API definition, there is no filtering parameter available for the GET /discussionBoard/audit/compliance/reports endpoint.
  // The scope of this test is therefore to verify the core functionality of retrieving the compliance audit records
  // with proper structure and type safety, since filtering by record_type is not supported by the API (request body is null).
  // Call the index endpoint to retrieve compliance audit records
  const response: IPageIDiscussionBoardComplianceRecord =
    await api.functional.discussionBoard.audit.compliance.reports.index(
      connection,
    );
  // Validate the structure and type of the response using typia.assert
  typia.assert(response);
  // Verify the pagination structure contains all required properties with correct types
  TestValidator.equals("pagination exists", response.pagination != null, true);
  TestValidator.equals(
    "pagination.current is number",
    typeof response.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination.limit is number",
    typeof response.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination.records is number",
    typeof response.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination.pages is number",
    typeof response.pagination.pages === "number",
    true,
  );
  // Verify data is an array
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // If there are any records, validate at least one has a valid record_type
  if (response.data.length > 0) {
    const firstRecord = response.data[0];
    TestValidator.predicate(
      "first record has valid record_type",
      firstRecord.record_type === "USER_REPORT" ||
        firstRecord.record_type === "MODERATOR_ACTION" ||
        firstRecord.record_type === "SYSTEM_TRIGGER" ||
        firstRecord.record_type === "APPEAL",
    );
  }
}
