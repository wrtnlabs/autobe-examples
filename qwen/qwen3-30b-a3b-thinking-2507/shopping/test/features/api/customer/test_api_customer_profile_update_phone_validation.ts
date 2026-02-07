import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
import type { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import type { IEcommerceDefaultAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDefaultAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_profile_update_phone_validation(connection: api.IConnection): Promise<void> {
    // 1. Register a new customer
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            display_name: RandomGenerator.name(),
            href: "http://example.com",
            referrer: "http://example.com",
        },
    });
    
    // 2. Test multiple phone number normalization scenarios
    const normalizationCases = [
        {
            input: '+1 (213) 555-1234',
            expected: '+12135551234',
        },
        {
            input: '1-213-555-1234',
            expected: '+12135551234',
        },
        {
            input: '0012135551234',
            expected: '+12135551234',
        },
        {
            input: '+44 20 7946 0123',
            expected: '+442079460123',
        },
    ];
    
    // 3. Update profile with the phone number in each test case
    for (const { input, expected } of normalizationCases) {
        const updatedCustomer = await api.functional.ecommerce.customer.profile.update(customerConnection, {
            body: {
                phone: input,
            }
        });
        typia.assert(updatedCustomer);
        // 4. Verify normalizing to expected format
        TestValidator.equals(`Phone normalized to '${expected}'`, updatedCustomer.phone, expected);
    }
}