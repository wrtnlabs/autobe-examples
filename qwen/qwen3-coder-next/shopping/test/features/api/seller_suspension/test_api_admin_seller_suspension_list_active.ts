import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator seller suspension listing functionality.
 * 1. Register admin account
 * 2. Retrieve active seller suspensions with default parameters
 * 3. Validate response structure and data types
 * 4. Test pagination functionality
 */
export async function test_api_admin_seller_suspension_list_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `admin-${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Retrieve active seller suspensions with default parameters
  const response =
    await api.functional.ecommerceMall.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals("pagination exists", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  // Test pagination structure
  TestValidator.equals(
    "pagination fields",
    typeof response.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination fields",
    typeof response.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination fields",
    typeof response.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination fields",
    typeof response.pagination.pages,
    "number",
  );
  // Test data structure
  if (response.data.length > 0) {
    const firstSuspension = response.data[0];
    TestValidator.equals(
      "suspension has id",
      typeof firstSuspension.id,
      "string",
    );
    TestValidator.predicate(
      "suspension has seller",
      firstSuspension.seller !== null,
    );
    TestValidator.predicate(
      "suspension has admin",
      firstSuspension.admin !== null,
    );
    TestValidator.equals(
      "suspension has created_at",
      typeof firstSuspension.created_at,
      "string",
    );
    TestValidator.equals(
      "suspension has updated_at",
      typeof firstSuspension.updated_at,
      "string",
    );
    // Validate seller structure
    const seller = firstSuspension.seller;
    TestValidator.equals("seller has id", typeof seller.id, "string");
    TestValidator.equals(
      "seller has shop_name",
      typeof seller.shop_name,
      "string",
    );
    TestValidator.equals(
      "seller has approval_status",
      typeof seller.approval_status,
      "string",
    );
    TestValidator.equals(
      "seller has is_suspended",
      typeof seller.is_suspended,
      "boolean",
    );
    TestValidator.equals(
      "seller has created_at",
      typeof seller.created_at,
      "string",
    );
    // Validate admin structure
    const admin = firstSuspension.admin;
    TestValidator.equals("admin has id", typeof admin.id, "string");
    TestValidator.equals("admin has email", typeof admin.email, "string");
    TestValidator.predicate(
      "admin has grade",
      admin.grade === "regular" || admin.grade === "super",
    );
    TestValidator.equals(
      "admin has created_at",
      typeof admin.created_at,
      "string",
    );
  }
  // 4. Test with pagination parameters
  const paginatedResponse =
    await api.functional.ecommerceMall.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "pagination limit applies",
    paginatedResponse.data.length <= 5,
  );
  TestValidator.equals(
    "pagination limit value",
    paginatedResponse.pagination.limit,
    5,
  );
}
