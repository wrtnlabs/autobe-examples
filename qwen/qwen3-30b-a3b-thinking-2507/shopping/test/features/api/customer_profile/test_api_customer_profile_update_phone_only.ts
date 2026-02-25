import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerProfile";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_phone_only(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as customer
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
            href: "https://example.com",
            referrer: "https://example.com",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });

    // 2. Generate valid international phone number
    const phoneNumber = RandomGenerator.mobile();

    // 3. Update phone number only
    const updatedProfile = await api.functional.ecommerce.customer.me.profile.update(customerConnection, {
        body: {
            phone_number: phoneNumber,
        },
    });

    typia.assert(updatedProfile);

    // 4. Validate phone number was updated
    TestValidator.equals("phone number matches", updatedProfile.phone_number, phoneNumber);
}