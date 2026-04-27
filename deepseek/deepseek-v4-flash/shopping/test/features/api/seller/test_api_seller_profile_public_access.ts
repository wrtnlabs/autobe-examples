import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_public_access(connection: api.IConnection): Promise<void> {
    // 1. Register a seller account with specific profile data
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerEmail: string & tags.Format<"email"> = typia.random<string & tags.Format<"email">>();
    const sellerPassword = RandomGenerator.alphaNumeric(16);
    const shopName = RandomGenerator.name();
    const shopDescription = RandomGenerator.paragraph({ sentences: 2 });
    const logoImage: string & tags.Format<"uri"> = typia.random<string & tags.Format<"uri">>();
    const href: string & tags.Format<"uri"> = typia.random<string & tags.Format<"uri">>();
    const referrer: string & tags.Format<"uri"> = typia.random<string & tags.Format<"uri">>();
    const seller = await authorize_seller_join(sellerConnection, {
        body: {
            email: sellerEmail,
            password: sellerPassword satisfies string,
            shop_name: shopName,
            shop_description: shopDescription,
            logo_image: logoImage,
            href,
            referrer,
        },
    });
    // 2. Access the public seller profile without any authentication
    const publicConnection: api.IConnection = { host: connection.host };
    const profile: IECommerceMallSellerProfile = await api.functional.eCommerceMall.administrator.sellers.profile.at(
        publicConnection,
        { sellerId: seller.id },
    );
    typia.assert(profile);
    // 3. Validate business logic
    TestValidator.equals("seller id matches", profile.seller.id, seller.id);
    TestValidator.equals("seller email matches", profile.seller.email, sellerEmail);
    TestValidator.equals("approval status is pending", profile.seller.approval_status, "pending");
    TestValidator.equals("shop name matches", profile.shopName, shopName);
    TestValidator.equals("shop description matches", profile.shopDescription, shopDescription);
    TestValidator.equals("logo image matches", profile.logoImage, logoImage);
    TestValidator.predicate("deletedAt is null", profile.deletedAt === null);
}
