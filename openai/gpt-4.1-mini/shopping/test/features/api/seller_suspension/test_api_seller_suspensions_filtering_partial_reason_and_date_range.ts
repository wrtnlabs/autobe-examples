import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSuspension";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_suspensions_filtering_partial_reason_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: `admin+${Date.now()}@testing.com`,
        password: "adminpassword",
      },
    });
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // We will run multiple queries with known suspensionReasons and suspendedAt range
  // Generate at least 3 different suspension records with known attributes
  // Since there is no utility for creating suspension records, we assume these already exist or are managed outside of this test
  // So we will just test filtering and pagination with random but controlled inputs
  // Prepare date range from 20 days ago to now
  const now = new Date();
  const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
  // Use a partial reason substring that would commonly appear
  const partialReason = "fraud";
  // Request body with partial suspensionReason and date range filters
  const requestBody: IShoppingMallSellerSuspension.IRequest = {
    suspensionReason: partialReason,
    suspendedAtStart: twentyDaysAgo.toISOString(),
    suspendedAtEnd: now.toISOString(),
    page: 1,
    limit: 50,
  };
  // Call the seller suspensions index endpoint
  const output: IPageIShoppingMallSellerSuspension.ISummary =
    await api.functional.shoppingMall.administrator.sellerSuspensions.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(output);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages count non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count non-negative",
    output.pagination.records >= 0,
  );
  // Validate each suspension item matches the partial reason and date range
  for (const suspension of output.data) {
    typia.assert(suspension);
    TestValidator.predicate(
      `suspension reason includes partial '${partialReason}'`,
      suspension.suspensionReason.toLowerCase().includes(partialReason),
    );
    const suspendedAtTime = new Date(suspension.suspendedAt).getTime();
    const startTime = twentyDaysAgo.getTime();
    const endTime = now.getTime();
    TestValidator.predicate(
      "suspendedAt within range",
      suspendedAtTime >= startTime && suspendedAtTime <= endTime,
    );
    // Validate seller summary exists and id matches
    TestValidator.predicate(
      "seller summary is present",
      suspension.seller !== null && typeof suspension.seller === "object",
    );
    TestValidator.predicate(
      "seller summary id valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        suspension.seller.id,
      ),
    );
  }
  // Authorization enforcement: a non-admin connection should be rejected
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("non-admin access is forbidden", async () => {
    await api.functional.shoppingMall.administrator.sellerSuspensions.index(
      unauthorizedConnection,
      { body: requestBody },
    );
  });
}
