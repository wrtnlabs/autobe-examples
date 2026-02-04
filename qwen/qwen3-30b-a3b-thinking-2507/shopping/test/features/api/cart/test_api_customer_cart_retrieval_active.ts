import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_cart_retrieval_active(connection: api.IConnection) {
    // Create a new customer account
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
        body: {
            // Properly format the request body without invalid 'satisfies' syntax
        }
    });

    // Retrieve the customer's active shopping carts
    const activeCarts: IPageIShoppingMallCart.ISummary = await api.functional.shoppingMall.customer.carts.index(customerConnection, {
        body: {
            status: "active"
        }
    });

    // Validate the response structure
    typia.assert(activeCarts);

    // Basic pagination validation
    TestValidator.equals("Pagination current should be 1", activeCarts.pagination.current, 1);
    TestValidator.equals("Pagination limit should be 10", activeCarts.pagination.limit, 10);

    // Check that cart data is in the expected format
    TestValidator.equals("Carts data should be an array", Array.isArray(activeCarts.data), true);
}