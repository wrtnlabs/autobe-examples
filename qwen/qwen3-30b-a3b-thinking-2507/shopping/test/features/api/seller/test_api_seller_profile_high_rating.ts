import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_seller_profile_high_rating(connection: api.IConnection): Promise<void> {
    // 1. Create seller account through registration
    const sellerEmail: string = typia.random<string & tags.Format<"email">>();
    const seller: IShoppingMallSeller.IAuthorized = await authorize_member_join(connection, {
        body: {
            email: sellerEmail,
            password: "securepassword123",
        }
    });
    typia.assert(seller);
    // 2. Retrieve public seller profile
    const profile: IShoppingMallSeller.ISummary = await api.functional.v1.seller._public.publicProfile(connection, {
        sellerId: seller.id,
    });
    typia.assert(profile);
    // 3. Verify high rating (4.5+ on 5.0 scale)
    TestValidator.predicate("seller rating should be high (>= 4.5)", profile.rating >= 4.5);
    // 4. Verify significant sales volume (100+ completed transactions)
    TestValidator.predicate("seller should have significant sales volume (>= 100)", profile.salesCount >= 100);
}