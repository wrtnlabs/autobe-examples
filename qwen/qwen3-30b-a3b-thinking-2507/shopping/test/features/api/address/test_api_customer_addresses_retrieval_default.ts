import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomerAddress";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_addresses_retrieval_default(connection: api.IConnection): Promise<void> {
    // Register customer with address data
    const customerConnection = { host: connection.host };
    const authResult = await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
            href: "http://localhost",
            referrer: "http://localhost",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    // Retrieve addresses with default pagination parameters
    const response = await api.functional.ecommerce.customer.addresses.index(customerConnection, {
        body: {
            page: 1,
            limit: 10,
        },
    });
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals("Current page should be 1", response.pagination.current, 1);
    TestValidator.equals("Limit should be 10", response.pagination.limit, 10);
    TestValidator.predicate("At least one address should exist", response.data.length > 0);
}