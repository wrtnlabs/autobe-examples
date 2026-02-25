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
export async function test_api_customer_profile_update_display_name_and_phone(connection: api.IConnection): Promise<void> {
    // 1. Customer authentication
    const customerConnection: api.IConnection = { host: connection.host };
    const customerJoinResult = await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        }
    });
    // 2. Generate valid update data
    const displayName = RandomGenerator.name();
    const phone = `+82${RandomGenerator.mobile("010")}`;
    // 3. Update profile
    const updatedProfile = await api.functional.ecommerce.customer.me.profile.update(customerConnection, {
        body: {
            display_name: displayName,
            phone_number: phone,
        }
    });
    // 4. Validate business logic - actual profile values
    TestValidator.equals("display name matches user input", updatedProfile.display_name, displayName);
    TestValidator.equals("phone number matches user input", updatedProfile.phone_number, phone);
}