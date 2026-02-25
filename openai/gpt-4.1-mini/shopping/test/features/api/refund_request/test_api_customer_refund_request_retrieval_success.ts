import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_request_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving a refund request successfully by a registered customer.
   *
   * 1. Customer registers (join) and obtains authorized session with token
   * 2. Generate random refundRequestId (simulate mode enables random success)
   * 3. Retrieve refund request details using refundRequestId
   * 4. Validate entire response object structure and key fields
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Use updated token connection
  customerConnection.headers = { Authorization: authorized.token.access };
  // Generate random refundRequestId with valid UUID format
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve refund request details
  const refundRequest =
    await api.functional.shoppingMall.customer.refund_requests.at(
      customerConnection,
      { refundRequestId },
    );
  typia.assert(refundRequest);
  // Validate refund request main properties
  TestValidator.equals(
    "refundRequest id matches",
    refundRequest.id,
    refundRequestId,
  );
  TestValidator.predicate(
    "refundRequest requestReason non-empty",
    typeof refundRequest.requestReason === "string" &&
      refundRequest.requestReason.length > 0,
  );
  TestValidator.predicate(
    "refundRequest status non-empty",
    typeof refundRequest.status === "string" && refundRequest.status.length > 0,
  );
  // Optional sellerResponseReason: string|null|undefined
  TestValidator.predicate(
    "sellerResponseReason is string|null|undefined",
    refundRequest.sellerResponseReason === null ||
      refundRequest.sellerResponseReason === undefined ||
      typeof refundRequest.sellerResponseReason === "string",
  );
  ["requestedAt", "createdAt", "updatedAt"].forEach((field) => {
    TestValidator.predicate(
      `refundRequest ${field} is ISO date-time string`,
      typeof (refundRequest as any)[field] === "string" &&
        !isNaN(Date.parse((refundRequest as any)[field])),
    );
  });
  if (
    refundRequest.respondedAt !== null &&
    refundRequest.respondedAt !== undefined
  ) {
    TestValidator.predicate(
      "refundRequest respondedAt is ISO date-time string",
      typeof refundRequest.respondedAt === "string" &&
        !isNaN(Date.parse(refundRequest.respondedAt)),
    );
  }
  TestValidator.predicate(
    "refundRequest deletedAt is null or ISO date-time string",
    refundRequest.deletedAt === null ||
      (typeof refundRequest.deletedAt === "string" &&
        !isNaN(Date.parse(refundRequest.deletedAt))),
  );
  // Validate nested summaries
  TestValidator.equals(
    "shoppingMallCustomer id matches",
    refundRequest.shoppingMallCustomer.id,
    authorized.id,
  );
  // Basic checks for seller summary
  TestValidator.predicate(
    "shoppingMallSeller has id",
    typeof refundRequest.shoppingMallSeller.id === "string" &&
      refundRequest.shoppingMallSeller.id.length > 0,
  );
  TestValidator.predicate(
    "shoppingMallSeller has email",
    typeof refundRequest.shoppingMallSeller.email === "string" &&
      refundRequest.shoppingMallSeller.email.length > 0,
  );
  TestValidator.predicate(
    "shoppingMallSeller has shopName",
    typeof refundRequest.shoppingMallSeller.shopName === "string" &&
      refundRequest.shoppingMallSeller.shopName.length > 0,
  );
  // Basic checks for order item summary
  TestValidator.predicate(
    "shoppingMallOrderItem has id",
    typeof refundRequest.shoppingMallOrderItem.id === "string" &&
      refundRequest.shoppingMallOrderItem.id.length > 0,
  );
  TestValidator.predicate(
    "shoppingMallOrderItem quantity is number",
    typeof refundRequest.shoppingMallOrderItem.quantity === "number",
  );
  TestValidator.predicate(
    "shoppingMallOrderItem status non-empty",
    typeof refundRequest.shoppingMallOrderItem.status === "string" &&
      refundRequest.shoppingMallOrderItem.status.length > 0,
  );
}
