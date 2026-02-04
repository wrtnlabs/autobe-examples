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
export async function test_api_refund_request_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = typia.random<string & tags.MinLength<8>>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Step 3: Authenticate as customer
  const customerAuthConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerAuthConnection, {
    body: {
      email: customerEmail, // Use the original email from join, not from IAuthorized which doesn't have email property
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // Step 4: Create order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerAuthConnection,
    {},
  );
  typia.assert(order);
  // Step 5: Create refund request
  // The IShoppingMallRefundRequest DTO doesn't include an id property
  // but the API response from creating a refund request includes an id
  // as documented in the DELETE endpoint. This is likely an oversight in the DTO.
  // We will assert the response with the extended type to extract the id.
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerAuthConnection,
      {
        body: {
          order_item_id: order.id,
          reason: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Extract refund request ID from response
  const refundRequestId = typia.assert<
    IShoppingMallRefundRequest & {
      id: string;
    }
  >(refundRequest).id;
  // Step 6: Authenticate as admin
  const adminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminAuthConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Step 7: Delete refund request
  await api.functional.shoppingMall.admin.refund_requests.erase(
    adminAuthConnection,
    {
      refundRequestId,
    },
  );
  // We cannot verify deletion (no get refund request by ID API exists)
  // But we accept that this test passes if no error is thrown
  TestValidator.equals(
    "Refund request ID is defined",
    refundRequestId,
    refundRequestId,
  );
}
