import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionDeletion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSectionDeletion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_section_deletion_audit_sort_order(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using utility function
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Call the audit deletions endpoint to get deletion records
  const result: IPageIEconomicBoardSectionDeletion =
    await api.functional.economicBoard.administrator.audit.deletions.index(
      adminConnection,
    );
  typia.assert(result);
  // Validate that we have at least two records to test ordering
  if (result.data.length < 2) {
    throw new Error("Insufficient deletion records for sort order validation");
  }
  // Extract timestamps for expected sorted order
  const timestamps: string[] = result.data.map((item) => item.created_at);
  // Sort timestamps in descending order (newest first)
  const expectedSortedTimestamps = [...timestamps].sort().reverse();
  // Create expected order of deletion records sorted by created_at descending
  const expectedSortedRecords = [...result.data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  // Transform IEconomicBoardSectionDeletion to objects with id property using section_id
  const expectedSortedRecordsWithId = expectedSortedRecords.map((record) => ({
    id: record.section_id,
  }));
  const actualRecordsWithId = result.data.map((record) => ({
    id: record.section_id,
  }));
  // Use TestValidator.index to verify that actual results match expected sorted order
  TestValidator.index(
    "deletion audit records sorted by created_at descending",
    expectedSortedRecordsWithId,
    actualRecordsWithId,
  );
}
