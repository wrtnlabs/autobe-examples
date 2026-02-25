import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellationRequest";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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

/**
 * Test seller approval of a pending cancellation request.
 * This test focuses on the cancellation request approval workflow.
 * Since the API doesn't provide endpoints to create products/orders for testing,
 * this test verifies the approval endpoint structure and handles both
 * existing and non-existing cancellation requests appropriately.
 */
export async function test_api_seller_cancellation_request_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create connections with proper isolation
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register and login customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerLoginData = {
    email: customerEmail,
    password: customerPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_customer_login(customerConnection, {
    body: customerLoginData,
  });
  // 3. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinData = {
    email: sellerEmail,
    password: sellerPassword,
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  };
  await api.functional.shoppingMall.auth.seller.join(sellerConnection, {
    body: sellerJoinData,
  });
  // 4. Login seller
  const sellerLoginData = {
    email: sellerEmail,
    password: sellerPassword,
  };
  await authorize_seller_login(sellerConnection, { body: sellerLoginData });
  // 5. Get pending cancellation requests
  const requests =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          limit: 10,
        },
      },
    );
  typia.assert(requests);
  // 6. Test approval with existing pending request if available
  if (requests.data.length > 0) {
    const firstRequest = requests.data[0];
    const approvedRequest =
      await api.functional.shoppingMall.seller.cancellation_requests.approve(
        sellerConnection,
        { requestId: firstRequest.id },
      );
    typia.assert(approvedRequest);
    TestValidator.equals(
      "request status is approved",
      approvedRequest.status,
      "approved",
    );
    TestValidator.notEquals(
      "responded_at is set after approval",
      approvedRequest.responded_at,
      null,
    );
  } else {
    // Test error handling when no pending requests exist
    await TestValidator.error(
      "should fail when request ID does not exist",
      async () => {
        const mockRequestId = typia.random<string & tags.Format<"uuid">>();
        await api.functional.shoppingMall.seller.cancellation_requests.approve(
          sellerConnection,
          { requestId: mockRequestId },
        );
      },
    );
  }
}
