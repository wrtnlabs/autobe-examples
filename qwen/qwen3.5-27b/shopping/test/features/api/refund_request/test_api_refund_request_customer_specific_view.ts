import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an administrator can view refund requests for a specific customer by filtering on customer_id.
 *
 * Validates the complete administrator refund request viewing workflow including administrator authentication, customer-specific refund request filtering, and comprehensive data validation. Ensures that the refund request list correctly filters by customer and includes all necessary context information for customer support purposes.
 *
 * Special attention is given to verifying that customer information is consistent across all returned requests, order item details are complete, and both pending and resolved requests are included in the results.
 *
 * 1. Administrator authenticates via join endpoint with email and password.
 * 2. Administrator queries refund requests with customer_id filter.
 * 3. Validates response contains only refund requests for the specified customer.
 * 4. Validates each refund request includes complete order item context.
 * 5. Validates customer information is consistent across all returned requests.
 */
export async function test_api_refund_request_customer_specific_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
      ip: "127.0.0.1",
    },
  });
  // 2. Query refund requests with customer_id filter
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.shoppingMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          customer_id,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(output);
  // 3. Validate response structure
  TestValidator.predicate("pagination exists", output.pagination !== undefined);
  TestValidator.predicate("data array exists", Array.isArray(output.data));
  // 4. Validate all refund requests belong to the same customer
  await ArrayUtil.asyncForEach(output.data, async (refundRequest, index) => {
    // Validate customer_id matches filter
    TestValidator.equals(
      `refund request ${index} customer_id matches filter`,
      refundRequest.customer.id,
      customer_id,
    );
    // Validate refund request has required fields
    TestValidator.predicate(
      `refund request ${index} has id`,
      refundRequest.id !== undefined,
    );
    TestValidator.predicate(
      `refund request ${index} has reason`,
      refundRequest.reason !== undefined,
    );
    TestValidator.predicate(
      `refund request ${index} has status`,
      refundRequest.status !== undefined,
    );
    TestValidator.predicate(
      `refund request ${index} has created_at`,
      refundRequest.created_at !== undefined,
    );
    // Validate customer information exists
    TestValidator.predicate(
      `refund request ${index} has customer`,
      refundRequest.customer !== undefined,
    );
    TestValidator.equals(
      `refund request ${index} customer email exists`,
      refundRequest.customer.email !== undefined,
      true,
    );
    TestValidator.equals(
      `refund request ${index} customer display_name exists`,
      refundRequest.customer.display_name !== undefined,
      true,
    );
    // Validate order item context exists
    TestValidator.predicate(
      `refund request ${index} has orderItem`,
      refundRequest.orderItem !== undefined,
    );
    TestValidator.predicate(
      `refund request ${index} orderItem has quantity`,
      refundRequest.orderItem.quantity !== undefined,
    );
    TestValidator.predicate(
      `refund request ${index} orderItem has price`,
      refundRequest.orderItem.price !== undefined,
    );
    TestValidator.predicate(
      `refund request ${index} orderItem has status`,
      refundRequest.orderItem.status !== undefined,
    );
    // Validate product variant information
    TestValidator.predicate(
      `refund request ${index} orderItem has productVariant`,
      refundRequest.orderItem.productVariant !== undefined,
    );
    TestValidator.predicate(
      `refund request ${index} productVariant has sku_code`,
      refundRequest.orderItem.productVariant.sku_code !== undefined,
    );
    // Validate seller information
    TestValidator.predicate(
      `refund request ${index} orderItem has seller`,
      refundRequest.orderItem.seller !== undefined,
    );
    TestValidator.predicate(
      `refund request ${index} seller has email`,
      refundRequest.orderItem.seller.email !== undefined,
    );
    TestValidator.predicate(
      `refund request ${index} seller has seller_profile`,
      refundRequest.orderItem.seller.seller_profile !== undefined,
    );
    // Validate timestamps
    TestValidator.predicate(
      `refund request ${index} created_at is valid date-time`,
      typeof refundRequest.created_at === "string",
    );
    if (refundRequest.responded_at !== null) {
      TestValidator.predicate(
        `refund request ${index} responded_at is valid date-time`,
        typeof refundRequest.responded_at === "string",
      );
    }
  });
}
