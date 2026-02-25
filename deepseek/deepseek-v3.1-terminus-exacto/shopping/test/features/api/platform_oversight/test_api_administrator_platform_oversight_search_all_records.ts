import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOversight";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOversight";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator platform oversight search with minimal parameters.
 * 1. Create administrator account via utility function
 * 2. Search oversight records with only page and limit
 * 3. Validate pagination metadata
 * 4. Validate each oversight record structure and content
 */
export async function test_api_administrator_platform_oversight_search_all_records(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Search platform oversight records with minimal parameters
  const page = typia.random<
    number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
  >();
  const limit = typia.random<
    number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>
  >();
  const searchResult =
    await api.functional.ecommerce.administrator.platform_oversight.index(
      adminConnection,
      {
        body: {
          page: page satisfies number as number,
          limit: limit satisfies number as number,
        } satisfies IEcommercePlatformOversight.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit",
    searchResult.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records count non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count non-negative",
    searchResult.pagination.pages >= 0,
  );
  // 4. Validate each oversight record structure and content
  const oversightTypes = [
    "health_check",
    "compliance_audit",
    "performance_review",
    "security_scan",
    "operational_assessment",
  ] as const;
  const severityLevels = ["info", "warning", "critical", "emergency"] as const;
  for (const record of searchResult.data) {
    typia.assert(record);
    // Validate required fields exist
    TestValidator.predicate("has id", record.id !== undefined);
    TestValidator.predicate(
      "has oversight_type",
      record.oversight_type !== undefined,
    );
    TestValidator.predicate(
      "has severity_level",
      record.severity_level !== undefined,
    );
    TestValidator.predicate("has resolved", record.resolved !== undefined);
    TestValidator.predicate(
      "has administrator",
      record.administrator !== undefined,
    );
    TestValidator.predicate("has created_at", record.created_at !== undefined);
    // Validate oversight_type enum
    TestValidator.predicate(
      `valid oversight_type: ${record.oversight_type}`,
      (oversightTypes as readonly string[]).includes(record.oversight_type),
    );
    // Validate severity_level enum
    TestValidator.predicate(
      `valid severity_level: ${record.severity_level}`,
      (severityLevels as readonly string[]).includes(record.severity_level),
    );
    // Validate administrator summary structure
    typia.assert(record.administrator);
    TestValidator.predicate(
      "has administrator id",
      record.administrator.id !== undefined,
    );
    TestValidator.predicate(
      "has administrator email",
      record.administrator.email !== undefined,
    );
    TestValidator.predicate(
      "has administrator created_at",
      record.administrator.created_at !== undefined,
    );
    // Validate timestamps format
    TestValidator.predicate(
      "valid timestamp format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        record.created_at,
      ),
    );
    TestValidator.predicate(
      "administrator timestamp format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        record.administrator.created_at,
      ),
    );
  }
  // 5. Test that unresolved records can be identified
  const unresolvedRecords = searchResult.data.filter(
    (record) => !record.resolved,
  );
  for (const record of unresolvedRecords) {
    TestValidator.predicate(
      "unresolved record has false resolved status",
      !record.resolved,
    );
  }
}
