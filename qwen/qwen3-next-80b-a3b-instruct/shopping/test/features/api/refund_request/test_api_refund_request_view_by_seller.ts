import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_view_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and seller accounts with known email addresses
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Login as customer to create a refund request
  const customerLoggedIn: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoggedIn, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Create a refund request using the provided utility function
  // This utility function internally creates the necessary order item context
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerLoggedIn,
      {
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 4. Login as seller
  const sellerLoggedIn: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoggedIn, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 5. View refund request as seller - seller can view refund requests for items they sold
  const viewedRefund =
    await api.functional.shoppingMall.customer.refund_requests.at(
      sellerLoggedIn,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(viewedRefund);
  // 6. Validate refund request details
  TestValidator.equals(
    "refund request ID matches",
    viewedRefund.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "refund request order item ID matches",
    viewedRefund.order_item_id,
    refundRequest.order_item_id,
  );
  TestValidator.equals(
    "refund request customer ID matches",
    viewedRefund.customer_id,
    refundRequest.customer_id,
  );
  TestValidator.equals(
    "refund request reason matches",
    viewedRefund.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "refund request status is pending",
    viewedRefund.status,
    "pending",
  );
  TestValidator.equals(
    "refund request responder_id is null",
    viewedRefund.responder_id,
    null,
  );
  TestValidator.equals(
    "refund request responded_at is null",
    viewedRefund.responded_at,
    null,
  );
  // 7. Validate snapshots
  TestValidator.predicate(
    "has snapshots",
    () =>
      viewedRefund.snapshots !== undefined &&
      viewedRefund.snapshots?.length > 0,
  );
  if (viewedRefund.snapshots && viewedRefund.snapshots.length > 0) {
    const firstSnapshot = viewedRefund.snapshots[0];
    TestValidator.equals("snapshot version is 1", firstSnapshot.version, 1);
    TestValidator.equals(
      "snapshot reason matches",
      firstSnapshot.reason,
      refundRequest.reason,
    );
    TestValidator.equals(
      "snapshot status is pending",
      firstSnapshot.status,
      "pending",
    );
    TestValidator.equals(
      "snapshot changed_by is customer",
      firstSnapshot.changed_by,
      "customer",
    );
    TestValidator.equals(
      "snapshot refund_request_id matches",
      firstSnapshot.refund_request_id,
      refundRequest.id,
    );
  }
}
