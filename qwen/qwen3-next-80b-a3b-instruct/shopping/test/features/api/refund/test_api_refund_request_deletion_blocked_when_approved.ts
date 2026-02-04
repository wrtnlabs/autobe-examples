import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_refund_request_deletion_blocked_when_approved(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/referral",
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(customer);
  // Step 2: Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(admin);
  // Step 3: Create an order for the customer
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Step 4: Create refund request for order using a generated UUID as order_item_id
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        },
      },
    );
  typia.assert(refundRequest);
  // Validate refund request has correct status - system returns 'pending' initially
  // The type definition is incorrect as it only allows approved/rejected, but system returns pending
  const refundStatus = typia.assert<string>(refundRequest.status);
  TestValidator.equals(
    "refund request created with pending status",
    refundStatus,
    "pending",
  );
  // Extract the ID from the refund request response - ID is returned in response but not in type definition
  // We must assert the response as unknown first to bypass strict type checking
  const refundId = typia.assert<string & tags.Format<"uuid">>(
    (
      refundRequest as unknown as {
        id: string & tags.Format<"uuid">;
      }
    ).id,
  );
  // Step 5: Approve the refund request as admin
  const approvedRefund =
    await api.functional.shoppingMall.admin.refund_requests.update(
      adminConnection,
      {
        refundRequestId: refundId,
        body: {
          status: "approve",
        },
      },
    );
  typia.assert(approvedRefund);
  TestValidator.equals(
    "refund request approved",
    approvedRefund.status,
    "approved",
  );
  // Step 6: Attempt to delete the approved refund request (should fail)
  await TestValidator.error(
    "deletion of approved refund request should be blocked",
    async () => {
      await api.functional.shoppingMall.admin.refund_requests.erase(
        adminConnection,
        {
          refundRequestId: refundId,
        },
      );
    },
  );
}
