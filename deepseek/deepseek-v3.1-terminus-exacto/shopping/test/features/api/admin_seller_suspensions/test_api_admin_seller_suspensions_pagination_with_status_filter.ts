import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator seller suspensions pagination with status filter.
 *
 * Authenticate as administrator and test the seller suspensions search endpoint
 * with pagination parameters while filtering by specific suspension status.
 * Validate pagination metadata accuracy with different page/limit combinations.
 */
export async function test_api_admin_seller_suspensions_pagination_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test pagination with status filter
  const statuses: ("active" | "lifted" | "expired" | undefined)[] = [
    "active",
    "lifted",
    "expired",
    undefined,
  ];
  for (const status of statuses) {
    // Test different page and limit combinations
    const testCases = [
      { page: 1, limit: 10 },
      { page: 1, limit: 25 },
      { page: 2, limit: 10 },
      { page: 3, limit: 5 },
    ];
    for (const testCase of testCases) {
      const requestBody: IEcommerceCacheConfigurationSnapshot.IRequest = {
        status,
        page: testCase.page satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        limit: testCase.limit satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      };
      const response =
        await api.functional.ecommerce.administrator.admin_seller_suspensions.index(
          adminConnection,
          { body: requestBody },
        );
      typia.assert(response);
      // Validate pagination metadata
      const { pagination, data } = response;
      TestValidator.equals(
        "current page matches request",
        pagination.current,
        testCase.page,
      );
      TestValidator.equals(
        "limit matches request",
        pagination.limit,
        testCase.limit,
      );
      TestValidator.predicate(
        "records count is non-negative",
        pagination.records >= 0,
      );
      TestValidator.predicate(
        "pages count is non-negative",
        pagination.pages >= 0,
      );
      // Validate pagination calculations
      if (pagination.records > 0) {
        TestValidator.equals(
          "pages calculation is correct",
          pagination.pages,
          Math.ceil(pagination.records / pagination.limit),
        );
      } else {
        TestValidator.equals(
          "pages should be 0 when no records",
          pagination.pages,
          0,
        );
      }
      // Validate data array size constraints
      TestValidator.predicate(
        "data length does not exceed limit",
        data.length <= pagination.limit,
      );
      // Validate each suspension record if data exists
      if (data.length > 0) {
        for (const suspension of data) {
          typia.assert(suspension);
          // Verify suspension structure
          TestValidator.predicate(
            "suspension has valid ID",
            typeof suspension.id === "string" && suspension.id.length > 0,
          );
          TestValidator.predicate(
            "suspension has reason",
            typeof suspension.suspension_reason === "string",
          );
          TestValidator.predicate(
            "suspension has valid start date",
            typeof suspension.suspension_start_date === "string",
          );
          // If status filter was applied, validate that all records match the filter
          if (status) {
            TestValidator.equals(
              "suspension status matches filter",
              suspension.status,
              status,
            );
          }
          // Validate nested seller structure
          typia.assert(suspension.seller);
          TestValidator.predicate(
            "seller has valid ID",
            typeof suspension.seller.id === "string" &&
              suspension.seller.id.length > 0,
          );
          TestValidator.predicate(
            "seller has email",
            typeof suspension.seller.email === "string",
          );
          // Validate nested administrator structure
          typia.assert(suspension.administrator);
          TestValidator.predicate(
            "administrator has valid ID",
            typeof suspension.administrator.id === "string" &&
              suspension.administrator.id.length > 0,
          );
          TestValidator.predicate(
            "administrator has email",
            typeof suspension.administrator.email === "string",
          );
        }
      }
    }
  }
  // Test edge cases
  const edgeCases = [
    { page: 1, limit: 1 }, // Minimum reasonable limit
    { page: 1, limit: 100 }, // Maximum allowed limit
    { page: 999, limit: 10 }, // Page beyond likely data range
  ];
  for (const edgeCase of edgeCases) {
    const requestBody: IEcommerceCacheConfigurationSnapshot.IRequest = {
      status: "active",
      page: edgeCase.page satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1>,
      limit: edgeCase.limit satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    };
    const response =
      await api.functional.ecommerce.administrator.admin_seller_suspensions.index(
        adminConnection,
        { body: requestBody },
      );
    typia.assert(response);
    // Validate basic pagination metadata even for edge cases
    TestValidator.equals(
      "current page matches request in edge case",
      response.pagination.current,
      edgeCase.page,
    );
    TestValidator.equals(
      "limit matches request in edge case",
      response.pagination.limit,
      edgeCase.limit,
    );
    TestValidator.predicate(
      "edge case data length does not exceed limit",
      response.data.length <= response.pagination.limit,
    );
  }
}
