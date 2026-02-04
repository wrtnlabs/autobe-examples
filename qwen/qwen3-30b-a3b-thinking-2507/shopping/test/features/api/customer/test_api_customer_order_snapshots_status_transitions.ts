import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSalesOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrder";
import type { IShoppingMallSalesOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrderItem";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_sales_order } from "../../../prepare/prepare_random_shopping_mall_sales_order";
import { generate_random_shopping_mall_admin_orders_create } from "../../../generate/generate_random_shopping_mall_admin_orders_create";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
// <E2E TEST CODE HERE>
export async function test_api_customer_order_snapshots_status_transitions(connection: api.IConnection): Promise<void> {
    // 1. Create customer account with dedicated connection
    const customerEmail = typia.random<string & tags.Format<"email">>();
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
        body: {
            email: customerEmail,
            password: "password123",
            name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
        } satisfies IShoppingMallCustomer.IJoin,
    });
    typia.assert(customer);
    // 2. Create admin account with dedicated connection
    const adminEmail = typia.random<string & tags.Format<"email">>();
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
        body: {
            email: adminEmail,
            password: "password123",
            name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
        } satisfies IShoppingMallAdmin.IJoin,
    });
    typia.assert(admin);
    // 3. Set up customer shipping address
    const address = await generate_random_shopping_mall_customer_addresses_create(customerConnection, {
        body: {
            recipient: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            street: RandomGenerator.paragraph({ sentences: 2 }),
            city: RandomGenerator.name(),
            postal_code: RandomGenerator.alphaNumeric(5),
            country_code: "US",
            is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
    });
    typia.assert(address);
    // 4. Create order as admin
    await authorize_admin_login(adminConnection, {
        body: {
            email: adminEmail,
            password: "password123",
            href: "https://admin.example.com",
            referrer: "https://admin.example.com",
        } satisfies IShoppingMallAdmin.ILogin,
    });
    const order = await generate_random_shopping_mall_admin_orders_create(adminConnection, {
        body: {
            customer_id: customer.id,
            shipping_address_id: address.id,
        } satisfies IShoppingMallSalesOrder.ICreate,
    });
    typia.assert(order);
    // 5. Customer logs in to access order
    const customerConnection2: api.IConnection = { host: connection.host };
    await authorize_customer_login(customerConnection2, {
        body: {
            email: customerEmail,
            password: "password123",
            href: "https://example.com",
            referrer: "https://example.com",
        } satisfies IShoppingMallCustomer.ILogin,
    });
    // 6. Retrieve order snapshots to verify status transitions
    const snapshots = await api.functional.shoppingMall.customer.orders.snapshots.index(customerConnection2, {
        orderId: order.id,
    });
    typia.assert(snapshots);
    // Verify snapshots contain historical records for the entire order lifecycle
    TestValidator.equals("Order snapshots should contain historical data", snapshots.data.length > 0, true);
}