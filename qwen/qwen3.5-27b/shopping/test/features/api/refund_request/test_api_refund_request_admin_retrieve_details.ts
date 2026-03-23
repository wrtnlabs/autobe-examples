import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated administrator can successfully retrieve detailed information about a specific refund request.
 *
 * This test verifies:
 * 1. Admin authentication via join endpoint
 * 2. Retrieval of refund request details by ID using admin connection
 * 3. Response validation including all required fields
 * 4. orderItem contains complete order item details
 * 5. customer contains customer profile information
 * 6. Status and timestamp fields are correctly populated
 */
export async function test_api_refund_request_admin_retrieve_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate a refund request ID for testing
  const refundRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve refund request details
  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refund_requests.at(
      adminConnection,
      {
        refundRequestId,
      },
    );
  typia.assert(refundRequest);
  // 4. Validate business logic - status is one of valid values
  TestValidator.predicate(
    "status is valid",
    ["pending", "approved", "rejected"].includes(refundRequest.status),
  );
  // 5. Validate orderItem business logic
  TestValidator.predicate(
    "orderItem status is valid",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      refundRequest.orderItem.status,
    ),
  );
  TestValidator.predicate(
    "quantity is at least 1",
    refundRequest.orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "price is non-negative",
    refundRequest.orderItem.price >= 0,
  );
  // 6. Validate customer business logic
  TestValidator.predicate(
    "customer status is valid",
    ["active", "suspended", "banned"].includes(refundRequest.customer.status),
  );
  // 7. Validate respondedAt based on status
  if (refundRequest.status === "pending") {
    TestValidator.equals(
      "respondedAt is null for pending requests",
      refundRequest.respondedAt,
      null,
    );
  } else {
    TestValidator.predicate(
      "respondedAt exists for approved/rejected",
      refundRequest.respondedAt !== null,
    );
  }
  // 8. Validate requestedAt is before or equal to createdAt
  TestValidator.predicate(
    "requestedAt is not after createdAt",
    new Date(refundRequest.requestedAt) <= new Date(refundRequest.createdAt),
  );
  // 9. Validate updatedAt is after or equal to createdAt
  TestValidator.predicate(
    "updatedAt is not before createdAt",
    new Date(refundRequest.updatedAt) >= new Date(refundRequest.createdAt),
  );
}
