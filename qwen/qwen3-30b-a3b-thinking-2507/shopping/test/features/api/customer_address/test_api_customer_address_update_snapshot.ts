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
import { prepare_random_ecommerce_customer_address } from "../../../prepare/prepare_random_ecommerce_customer_address";
import { generate_random_ecommerce_customer_me_addresses_create } from "../../../generate/generate_random_ecommerce_customer_me_addresses_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_address_update_snapshot(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as customer
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });

    // 2. Create initial address for update
    const address = await generate_random_ecommerce_customer_me_addresses_create(customerConnection, {});

    // 3. Create dedicated connection for update
    const updateConnection: api.IConnection = { host: connection.host };
    const updatedAddress = await api.functional.ecommerce.customer.addresses.update(updateConnection, {
        addressId: address.id,
        body: {
            recipient_name: address.recipient_name,
            phone: address.phone,
            street_address: address.street_address,
            city: address.city,
            state: address.state,
            postal_code: address.postal_code,
            is_default: address.is_default,
        }
    });

    // 4. Verify unchanged response
    typia.assert(updatedAddress);
    TestValidator.equals("address unchanged after identical update", updatedAddress, address);
}