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
export async function test_api_compliance_audit_retrieval_all_records(
  connection: api.IConnection,
): Promise<void> {
  // Create an unauthenticated connection for compliance audit retrieval (no auth required)
  const auditConnection: api.IConnection = { host: connection.host };
  // Call the API endpoint to retrieve all compliance audit records
  const response: IPageIDiscussionBoardComplianceRecord =
    await api.functional.discussionBoard.audit.compliance.reports.index(
      auditConnection,
    );
  // Validate the response structure and types using typia.assert
  // This fully validates all fields, formats, types, and constraints as defined in the DTO
  typia.assert(response);
}
