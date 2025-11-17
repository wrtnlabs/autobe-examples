import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellation";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";

export async function test_api_admin_order_cancellation_management(
  connection: api.IConnection,
) {
  // 1. Admin account registration via join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "1234",
    ip: null,
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000/",
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // 2. Admin login operation to switch user actor context
  const adminLoginBody = {
    email: adminEmail,
    password: "1234",
    ip: null,
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoginAuthorized);

  // 3. Customer account registration via join
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "1234",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000/",
  } satisfies IShoppingMallCustomer.ICreate;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Customer login operation to switch user actor context
  const customerLoginBody = {
    email: customerEmail,
    password: "1234",
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuthorized);

  // 5. Customer places a new shopping mall order
  const orderBody = {
    order_number: RandomGenerator.alphaNumeric(12),
    order_status: "pending",
    payment_status: "pending",
    total_amount: 10000,
    shipping_address: "Seoul, Korea, Some Street 123",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 6. Switch back to admin user context
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 7. Admin retrieves order cancellation requests with pagination
  const cancellationRequestBody = {
    page: 1,
    limit: 10,
    search: undefined,
    status: undefined,
    customer_id: customerAuthorized.id,
    order_id: order.id,
  } satisfies IShoppingMallOrderCancellation.IRequest;
  const cancellationPage: IPageIShoppingMallOrderCancellation.ISummary =
    await api.functional.shoppingMall.admin.orderCancellations.index(
      connection,
      { body: cancellationRequestBody },
    );
  typia.assert(cancellationPage);

  // 8. Validate the cancellation requests are relevant to the current order and customer
  for (const cancellation of cancellationPage.data) {
    TestValidator.equals(
      "cancellation belongs to correct order",
      cancellation.shopping_mall_order_id,
      order.id,
    );
  }
}
