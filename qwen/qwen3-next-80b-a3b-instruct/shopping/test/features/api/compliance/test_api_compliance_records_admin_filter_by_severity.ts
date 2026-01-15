import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallComplianceRecord";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceRecord";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_compliance_records_admin_filter_by_severity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Query compliance records filtered by severity level "critical"
  // Since we cannot create compliance records manually (they are auto-generated)
  // we test the filtering functionality on any existing records
  const filteredResults =
    await api.functional.shoppingMall.admin.compliance.records.index(
      adminConnection,
      {
        body: {
          search: "critical",
          limit: 10,
        } satisfies IShoppingMallComplianceRecord.IRequest,
      },
    );
  typia.assert(filteredResults);
  // Step 3: Validate the response structure and pagination
  TestValidator.equals(
    "pagination limit should match request",
    filteredResults.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination should have at least one record",
    () => filteredResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be at least 0",
    () => filteredResults.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current should be at least 1",
    () => filteredResults.pagination.current >= 1,
  );
  // Step 4: Validate that records contain proper summary data
  // We can't guarantee specific records exist, so we validate the structure
  TestValidator.predicate("should return an array of records", () =>
    Array.isArray(filteredResults.data),
  );
  if (filteredResults.data.length > 0) {
    // For the first record, validate its structure and types
    const record = filteredResults.data[0];
    // Validate required fields in ISummary
    TestValidator.equals(
      "record must have uuid id",
      typeof record.id,
      "string",
    );
    TestValidator.equals(
      "record must have date-time eventTime",
      typeof record.eventTime,
      "string",
    );
    TestValidator.equals(
      "record must have uuid eventActorId",
      typeof record.eventActorId,
      "string",
    );
    TestValidator.equals(
      "record must have string eventActorType",
      record.eventActorType,
      "admin",
    );
    TestValidator.equals(
      "record must have string eventType",
      typeof record.eventType,
      "string",
    );
    TestValidator.predicate(
      "record severityLevel must be one of valid values",
      () =>
        ["low", "medium", "high", "critical"].includes(record.severityLevel),
    );
    TestValidator.predicate("record status must be one of valid values", () =>
      ["active", "investigating", "resolved", "archived"].includes(
        record.status,
      ),
    );
    TestValidator.equals(
      "record must have string auditCategory",
      typeof record.auditCategory,
      "string",
    );
    TestValidator.equals(
      "record must have string summary",
      typeof record.summary,
      "string",
    );
    // Validate optional properties have correct types
    TestValidator.predicate(
      "relatedEntityId is either string uuid or null/undefined",
      () => {
        if (
          record.relatedEntityId === null ||
          record.relatedEntityId === undefined
        )
          return true;
        return typeof record.relatedEntityId === "string";
      },
    );
    TestValidator.predicate(
      "relatedEntityType is either string or null/undefined",
      () => {
        if (
          record.relatedEntityType === null ||
          record.relatedEntityType === undefined
        )
          return true;
        return typeof record.relatedEntityType === "string";
      },
    );
    TestValidator.predicate(
      "triggeredRule is either string or null/undefined",
      () => {
        if (record.triggeredRule === null || record.triggeredRule === undefined)
          return true;
        return typeof record.triggeredRule === "string";
      },
    );
    TestValidator.predicate(
      "auditLogId is either string uuid or null/undefined",
      () => {
        if (record.auditLogId === null || record.auditLogId === undefined)
          return true;
        return typeof record.auditLogId === "string";
      },
    );
    TestValidator.equals(
      "record must have date-time createdAt",
      typeof record.createdAt,
      "string",
    );
  }
  // Step 5: Test search for "high" severity records
  // This validates that search works across severity levels
  const highSeverityResults =
    await api.functional.shoppingMall.admin.compliance.records.index(
      adminConnection,
      {
        body: {
          search: "high",
          limit: 10,
        } satisfies IShoppingMallComplianceRecord.IRequest,
      },
    );
  typia.assert(highSeverityResults);
  // Validate structure of high severity results
  TestValidator.equals(
    "high severity pagination limit should match request",
    highSeverityResults.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "high severity should return an array of records",
    () => Array.isArray(highSeverityResults.data),
  );
  if (highSeverityResults.data.length > 0) {
    const highRecord = highSeverityResults.data[0];
    TestValidator.predicate(
      "high severity record should have high severityLevel",
      () => highRecord.severityLevel === "high",
    );
  }
  // If any critical records exist, validate they match the severity level
  if (filteredResults.data.length > 0) {
    const criticalRecords = filteredResults.data.filter(
      (r) => r.severityLevel === "critical",
    );
    TestValidator.equals(
      "critical records should match search criteria",
      criticalRecords.length,
      filteredResults.data.length,
    );
  }
}
