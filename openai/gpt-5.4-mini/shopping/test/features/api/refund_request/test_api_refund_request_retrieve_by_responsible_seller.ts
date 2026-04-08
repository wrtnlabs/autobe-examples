import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_request_retrieve_by_responsible_seller(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving a live refund request by the responsible seller.
   *
   * Verifies that the seller-authenticated caller can read the refund request record for an owned order item and that the response preserves the linked order item, customer, seller, optional administrator reference, request state, review metadata, and lifecycle timestamps.
   *
   * 1. Creates a seller-authenticated connection using a separate connection object.
   * 2. Calls the refund-request retrieval endpoint with stable UUID inputs.
   * 3. Validates the returned refund request schema and its linked relations.
   * 4. Confirms the request is read-only by ensuring repeated retrieval returns the same data.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const first =
    await api.functional.mallPlatform.seller.orderItems.refundRequests.at(
      sellerConnection,
      {
        orderItemId,
        refundRequestId,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.seller.orderItems.refundRequests.at(
      sellerConnection,
      {
        orderItemId,
        refundRequestId,
      },
    );
  typia.assert(second);
  TestValidator.equals("refund request id", first.id, second.id);
  TestValidator.equals("linked order item", first.orderItem, second.orderItem);
  TestValidator.equals("linked customer", first.customer, second.customer);
  TestValidator.equals("linked seller", first.seller, second.seller);
  TestValidator.equals(
    "administrator reference",
    first.administrator,
    second.administrator,
  );
  TestValidator.equals("reason", first.reason, second.reason);
  TestValidator.equals("status", first.status, second.status);
  TestValidator.equals("reviewedAt", first.reviewedAt, second.reviewedAt);
  TestValidator.equals("reviewNote", first.reviewNote, second.reviewNote);
  TestValidator.equals("createdAt", first.createdAt, second.createdAt);
  TestValidator.equals("updatedAt", first.updatedAt, second.updatedAt);
  TestValidator.equals("deletedAt", first.deletedAt, second.deletedAt);
  TestValidator.predicate(
    "administrator reference may be null or a summary object",
    first.administrator === null || typeof first.administrator === "object",
  );
  TestValidator.predicate(
    "refund request is associated with an order item",
    !!first.orderItem,
  );
  TestValidator.predicate(
    "refund request is associated with a customer",
    !!first.customer,
  );
  TestValidator.predicate(
    "refund request is associated with a seller",
    !!first.seller,
  );
}
