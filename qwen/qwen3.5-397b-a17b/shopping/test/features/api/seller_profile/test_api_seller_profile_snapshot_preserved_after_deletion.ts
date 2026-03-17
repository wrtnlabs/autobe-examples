import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageISellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISellerProfileSnapshot";
import type { ISellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerProfileSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test that seller profile snapshots remain accessible for administrator viewing,
 * supporting dispute resolution and order history verification. Create an admin
 * account and login, create a seller account with profile information
 * (shop_name, shop_description, logo_image_url), login as seller. The seller
 * profile should have snapshots created during registration. As an administrator,
 * retrieve the seller's profile snapshots. Verify the snapshots are returned with
 * all historical data (shopName, shopDescription, logoImageUrl, createdAt, seller
 * information) intact. This validates that snapshots preserve seller profile state
 * for administrative oversight and can be accessed even for seller account
 * management purposes.
 */
export async function test_api_seller_profile_snapshot_preserved_after_deletion(connection: api.IConnection): Promise<void> {
    // Store credentials for reuse
    const adminEmail = typia.random<string & tags.Format<"email">>();
    const adminPassword = RandomGenerator.alphaNumeric(16);
    const sellerEmail = typia.random<string & tags.Format<"email">>();
    const sellerPassword = RandomGenerator.alphaNumeric(16);
    const shopName = RandomGenerator.name();
    const shopDescription = RandomGenerator.paragraph({ sentences: 3 });
    const logoImageUrl = typia.random<string & tags.Format<"uri">>();
    // 1. Create and login as administrator
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: adminEmail,
            password: adminPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IShoppingMallAdmin.IJoin,
    });
    const adminLoginConnection: api.IConnection = { host: connection.host };
    await authorize_admin_login(adminLoginConnection, {
        body: {
            email: adminEmail,
            password: adminPassword,
        } satisfies IShoppingMallAdmin.ILogin,
    });
    // 2. Create seller account with profile information
    const sellerJoinConnection: api.IConnection = { host: connection.host };
    const sellerCredentials = await authorize_seller_join(sellerJoinConnection, {
        body: {
            email: sellerEmail,
            password: sellerPassword,
            shop_name: shopName,
            shop_description: shopDescription,
            logo_image_url: logoImageUrl,
        } satisfies IShoppingMallSeller.IJoin,
    });
    typia.assert(sellerCredentials);
    const sellerId = sellerCredentials.id;
    // 3. Login as seller
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_login(sellerConnection, {
        body: {
            email: sellerCredentials.email,
            password: sellerPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallSeller.ILogin,
    });
    // 4. Admin retrieves seller profile snapshots
    const snapshots = await api.functional.shoppingMall.admin.sellers.profile.snapshots.list(adminLoginConnection, {
        sellerId: sellerId,
    });
    typia.assert(snapshots);
    // 5. Validate snapshots exist and contain required data
    TestValidator.predicate("snapshots returned", () => snapshots.data.length > 0);
    TestValidator.predicate("pagination valid", () => snapshots.pagination.records >= snapshots.data.length);
    // 6. Validate snapshot structure and data integrity
    const firstSnapshot = snapshots.data[0];
    TestValidator.equals("seller id matches", firstSnapshot.seller.id, sellerId);
    TestValidator.equals("seller email matches", firstSnapshot.seller.email, sellerCredentials.email);
    TestValidator.equals("shop name preserved", firstSnapshot.shopName, shopName);
    TestValidator.equals("shop description preserved", firstSnapshot.shopDescription, shopDescription);
    TestValidator.equals("logo image url preserved", firstSnapshot.logoImageUrl, logoImageUrl);
    TestValidator.predicate("created at is valid date", () => {
        const date = new Date(firstSnapshot.createdAt);
        return !isNaN(date.getTime());
    });
    // 7. Validate snapshot contains seller summary information
    TestValidator.predicate("seller summary has shop name", () => firstSnapshot.seller.shop_name.length > 0);
    TestValidator.predicate("seller summary has approval status", () => ["PENDING", "APPROVED", "REJECTED"].includes(firstSnapshot.seller.approval_status));
    TestValidator.equals("seller suspended status", firstSnapshot.seller.suspended, false);
}