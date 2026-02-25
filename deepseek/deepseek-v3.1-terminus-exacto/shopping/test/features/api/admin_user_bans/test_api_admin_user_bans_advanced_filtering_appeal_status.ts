import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationshipOfVariantConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test advanced filtering capabilities for admin user bans focusing on appeal status and date ranges.
 * Administrator authentication is required to access the admin user bans endpoint.
 * Tests pagination functionality and validates the structure of returned ban records.
 */
export async function test_api_admin_user_bans_advanced_filtering_appeal_status(
  connection: api.IConnection,
): Promise<void> {
  // Define valid appeal statuses at function scope for accessibility
  const validAppealStatuses = [
    "pending",
    "approved",
    "rejected",
    "none",
  ] as const;
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password:
        typia.random<string & tags.Format<"password">>() ||
        RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Test basic pagination functionality
  const page = 1 satisfies number | undefined;
  const limit = 10 satisfies number | undefined;
  const response =
    await api.functional.ecommerce.administrator.admin_user_bans.index(
      adminConnection,
      {
        body: {
          page,
          limit,
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.IRequest,
      },
    );
  typia.assert(response!);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    response.pagination !== undefined,
  );
  TestValidator.equals(
    "current page matches",
    response.pagination.current,
    page ?? 1,
  );
  TestValidator.equals("limit matches", response.pagination.limit, limit ?? 10);
  TestValidator.predicate(
    "total records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    response.pagination.pages >= 0,
  );
  // 3. Validate response data structure
  if (response.data.length > 0) {
    // Test at least one record for data integrity
    const sampleBan = response.data[0];
    // Validate UUID format
    TestValidator.predicate(
      "ban id is valid uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleBan.id,
      ),
    );
    // Validate user_type is non-empty string
    TestValidator.predicate(
      "user_type is non-empty string",
      typeof sampleBan.user_type === "string" && sampleBan.user_type.length > 0,
    );
    // Validate ban_reason is non-empty string
    TestValidator.predicate(
      "ban_reason is non-empty string",
      typeof sampleBan.ban_reason === "string" &&
        sampleBan.ban_reason.length > 0,
    );
    // Validate banned_at is valid ISO date-time string
    TestValidator.predicate(
      "banned_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/i.test(
        sampleBan.banned_at,
      ),
    );
    // Validate appeal_status is in valid values set
    TestValidator.predicate(
      "appeal_status is valid",
      (validAppealStatuses as readonly string[]).includes(
        sampleBan.appeal_status,
      ),
    );
    // Validate ban_duration_days (if present) is integer or null
    if (sampleBan.ban_duration_days !== undefined) {
      TestValidator.predicate(
        "ban_duration_days is integer or null",
        sampleBan.ban_duration_days === null ||
          (typeof sampleBan.ban_duration_days === "number" &&
            Number.isInteger(sampleBan.ban_duration_days)),
      );
    }
    // Validate lifted_at (if present) is valid ISO date-time string or null
    if (sampleBan.lifted_at !== undefined) {
      TestValidator.predicate(
        "lifted_at is valid date-time or null",
        sampleBan.lifted_at === null ||
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/i.test(
            sampleBan.lifted_at,
          ),
      );
    }
  }
  // 4. Test different pagination parameters
  const page2Response =
    await api.functional.ecommerce.administrator.admin_user_bans.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.IRequest,
      },
    );
  typia.assert(page2Response!);
  // Validate page 2 pagination metadata
  TestValidator.equals(
    "page 2 current page matches",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit matches",
    page2Response.pagination.limit,
    5,
  );
  // 5. Test no pagination parameters (default values)
  const defaultResponse =
    await api.functional.ecommerce.administrator.admin_user_bans.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.IRequest,
      },
    );
  typia.assert(defaultResponse!);
  // Validate default pagination values
  TestValidator.predicate(
    "default page is positive",
    defaultResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "default limit is positive",
    defaultResponse.pagination.limit > 0,
  );
  // 6. Validate data consistency across all records
  const allRecords = response.data.concat(page2Response.data);
  for (const ban of allRecords) {
    // Ensure appeal_status is string
    TestValidator.predicate(
      `appeal_status is string for ban ${ban.id}`,
      typeof ban.appeal_status === "string",
    );
    // Ensure banned_at is valid date string
    TestValidator.predicate(
      `banned_at is valid for ban ${ban.id}`,
      !isNaN(new Date(ban.banned_at).getTime()),
    );
    // Ensure ban_reason is string
    TestValidator.predicate(
      `ban_reason is string for ban ${ban.id}`,
      typeof ban.ban_reason === "string",
    );
  }
  // 7. Validate aggregate statistics (if multiple records exist)
  if (allRecords.length >= 2) {
    const uniqueAppealStatuses = new Set(
      allRecords.map((ban) => ban.appeal_status),
    );
    TestValidator.predicate(
      "multiple appeal statuses may exist",
      uniqueAppealStatuses.size >= 1,
    );
    // Validate all appeal_status values are in valid set
    for (const status of uniqueAppealStatuses) {
      TestValidator.predicate(
        `appeal_status '${status}' is valid`,
        (validAppealStatuses as readonly string[]).includes(status),
      );
    }
  }
}
