import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_addresses_list_with_multiple_addresses(connection: api.IConnection): Promise<void> {
    // 1. Register a new customer account
    const customerConnection: api.IConnection = { host: connection.host };
    const registered = await authorize_customer_join(customerConnection, {});
    typia.assert(registered);

    // 2. Create multiple shipping addresses (3 addresses with different locations)
    const address1 = await generate_random_ecommerce_mall_customer_customers_addresses_create(customerConnection, {
        body: {
            recipient_name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            street_address: `${randint(1, 9999)} Main Street`,
            city: "Seoul",
            state: "Gangnam-gu",
            postal_code: "12345",
            country: "South Korea",
        },
    });
    typia.assert(address1);

    const address2 = await generate_random_ecommerce_mall_customer_customers_addresses_create(customerConnection, {
        body: {
            recipient_name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            street_address: `${randint(1, 9999)} Broadway Avenue`,
            city: "Busan",
            state: "Haeundae-gu",
            postal_code: "67890",
            country: "South Korea",
        },
    });
    typia.assert(address2);

    const address3 = await generate_random_ecommerce_mall_customer_customers_addresses_create(customerConnection, {
        body: {
            recipient_name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            street_address: `${randint(1, 9999)} Oak Road`,
            city: "Incheon",
            state: "Jung-gu",
            postal_code: "11111",
            country: "South Korea",
            is_default: true,
        },
    });
    typia.assert(address3);

    // 3. List all addresses
    const addresses = await api.functional.ecommerceMall.customer.addresses.list(customerConnection);
    const validatedAddresses = typia.assert<IEcommerceMallShippingAddress[]>(addresses);

    // 4. Validate response is an array
    TestValidator.equals("addresses is array", Array.isArray(validatedAddresses), true);

    // 5. Validate the number of addresses matches (3 addresses created)
    TestValidator.equals("address count matches", validatedAddresses.length, 3);

    // 6. Validate each address has complete details
    for (const addr of validatedAddresses) {
        TestValidator.predicate("has recipient_name", !!addr.recipient_name);
        TestValidator.predicate("has phone", !!addr.phone);
        TestValidator.predicate("has street_address", !!addr.street_address);
        TestValidator.predicate("has city", !!addr.city);
        TestValidator.predicate("has state", !!addr.state);
        TestValidator.predicate("has postal_code", !!addr.postal_code);
        TestValidator.predicate("has country", !!addr.country);
        TestValidator.predicate("has is_default boolean", typeof addr.is_default === "boolean");
        TestValidator.predicate("has customer summary", !!addr.customer);
        TestValidator.predicate("customer has id", !!addr.customer.id);
        TestValidator.predicate("customer has email", !!addr.customer.email);
    }

    // 7. Validate exactly one address has is_default = true
    const defaultAddresses = validatedAddresses.filter((a) => a.is_default === true);
    TestValidator.equals("exactly one default address", defaultAddresses.length, 1);

    // 8. Validate other addresses have is_default = false
    const nonDefaultAddresses = validatedAddresses.filter((a) => a.is_default === false);
    TestValidator.equals("remaining addresses are not default", nonDefaultAddresses.length, 2);

    // 9. Validate the addresses match what we created (by city)
    const cityMap = new Map([
        [address1.id, address1.city],
        [address2.id, address2.city],
        [address3.id, address3.city],
    ]);
    for (const addr of validatedAddresses) {
        const originalCity = cityMap.get(addr.id);
        TestValidator.equals(`address ${addr.id} city matches`, addr.city, originalCity);
    }

    // 10. Validate customer ID matches in all addresses
    const customerId = registered.id;
    for (const addr of validatedAddresses) {
        TestValidator.equals("customer ID matches", addr.customer.id, customerId);
    }
}