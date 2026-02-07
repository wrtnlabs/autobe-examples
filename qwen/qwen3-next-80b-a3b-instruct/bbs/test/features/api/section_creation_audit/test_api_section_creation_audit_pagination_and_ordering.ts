import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardSectionCreation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionCreation";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardSectionCreation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSectionCreation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_section_creation_audit_pagination_and_ordering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_administrator_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
    } satisfies IEconomicBoardSuperAdministrator.IJoin,
  });
  // Request second page of section creation audit with limit=20, offset=20
  const auditResponse =
    await api.functional.economicBoard.superAdministrator.audit.creations.index(
      superAdminConnection,
    );
  // Validate entire response structure
  typia.assert(auditResponse);
  // Verify pagination details match expectations (limit=20, offset=20)
  TestValidator.equals(
    "pagination limit is 20",
    auditResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination current page is 2",
    auditResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination has exactly 20 records",
    auditResponse.data.length,
    20,
  );
  // Verify each record has the expected audit schema
  for (const record of auditResponse.data) {
    const recordTyped = record as any;
    TestValidator.predicate(
      "record has created_at timestamp",
      typeof recordTyped.created_at === "string",
    );
    TestValidator.predicate(
      "created_at is ISO 8601 format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(recordTyped.created_at),
    );
  }
  // Verify data is sorted by creation timestamp in descending order (newest first)
  for (let i = 0; i < auditResponse.data.length - 1; i++) {
    const current = auditResponse.data[i];
    const next = auditResponse.data[i + 1];
    const currentTyped = current as any;
    const nextTyped = next as any;
    TestValidator.predicate(
      "timestamp descending order",
      currentTyped.created_at >= nextTyped.created_at,
    );
  }
}