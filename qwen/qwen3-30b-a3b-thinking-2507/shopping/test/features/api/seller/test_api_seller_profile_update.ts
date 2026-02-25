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
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_profile_update(connection: api.IConnection) {
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceSeller.IJoin,
    });
    const displayName = RandomGenerator.alphabets(30);
    const phoneNumber = RandomGenerator.mobile("+1");
    const updatedProfile = await api.functional.ecommerce.seller.profile.update(sellerConnection, {
        body: {
            display_name: displayName,
            phone_number: phoneNumber,
        } satisfies IEcommerceCustomerProfile.IUpdate,
    });
    typia.assert(updatedProfile);
    TestValidator.equals("display name matches input", updatedProfile.display_name, displayName);
    TestValidator.equals("phone number matches input", updatedProfile.phone_number, phoneNumber);
}