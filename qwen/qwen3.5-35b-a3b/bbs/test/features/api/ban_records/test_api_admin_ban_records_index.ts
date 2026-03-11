import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin ban records index endpoint to retrieve paginated ban record list.
 *
 * Workflow:
 * 1. Admin authentication via join
 * 2. Retrieve ban records with pagination
 * 3. Validate pagination metadata and record structure
 * 4. Validate sorting order (newest first by default)
 */
export async function test_api_admin_ban_records_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<IEconomicPoliticalBoardAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // 2. Retrieve ban records with default pagination
  const banRecordsResponse =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(banRecordsResponse);
  // 3. Validate pagination metadata
  const pagination = banRecordsResponse.pagination;
  TestValidator.predicate(
    "current page is non-negative",
    () => pagination.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", () => pagination.limit >= 0);
  TestValidator.predicate(
    "records count is non-negative",
    () => pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    () => pagination.pages >= 0,
  );
  // 4. Validate pagination calculation
  const expectedPages =
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages calculated correctly",
    pagination.pages,
    expectedPages,
  );
  // 5. Validate ban record data structure
  const banRecords = banRecordsResponse.data;
  // Handle case where no ban records exist
  if (banRecords.length === 0) {
    TestValidator.equals(
      "no ban records returns empty array",
      banRecords.length,
      0,
    );
    return;
  }
  // Validate each ban record
  for (const record of banRecords) {
    typia.assert(record);
    // Validate record ID is UUID
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    TestValidator.predicate("record id is valid UUID", () =>
      uuidPattern.test(record.id),
    );
    // Validate user reference
    typia.assert(record.user);
    TestValidator.predicate("record user id is valid UUID", () =>
      uuidPattern.test(record.user.id),
    );
    TestValidator.predicate(
      "record user has valid grade",
      () => record.user.grade === "regular" || record.user.grade === "super",
    );
    // Validate banned by admin reference
    typia.assert(record.bannedByAdmin);
    TestValidator.predicate("record bannedByAdmin id is valid UUID", () =>
      uuidPattern.test(record.bannedByAdmin.id),
    );
    TestValidator.predicate(
      "record bannedByAdmin has valid grade",
      () =>
        record.bannedByAdmin.grade === "regular" ||
        record.bannedByAdmin.grade === "super",
    );
    // Validate ban reason is non-empty string
    TestValidator.predicate(
      "record has ban reason",
      () => record.reason.length > 0,
    );
    // Validate creation timestamp is ISO 8601 date-time
    const dateTimePattern =
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/;
    TestValidator.predicate("record has valid createdAt timestamp", () =>
      dateTimePattern.test(record.createdAt),
    );
  }
  // 6. Validate sorting order (newest first by default)
  if (banRecords.length > 1) {
    for (let i = 1; i < banRecords.length; i++) {
      TestValidator.predicate(
        "records sorted newest first - record " +
          i +
          " should be older than record " +
          (i - 1),
        () =>
          new Date(banRecords[i].createdAt) <=
          new Date(banRecords[i - 1].createdAt),
      );
    }
  }
}