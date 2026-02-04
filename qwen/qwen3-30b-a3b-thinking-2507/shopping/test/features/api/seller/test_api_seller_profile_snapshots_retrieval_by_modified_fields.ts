import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { prepare_random_shopping_mall_seller_profile_snapshot } from "../../../prepare/prepare_random_shopping_mall_seller_profile_snapshot";
import { generate_random_shopping_mall_seller_profile_snapshots_create } from "../../../generate/generate_random_shopping_mall_seller_profile_snapshots_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_retrieval_by_modified_fields(connection: api.IConnection): Promise<void> {
    // Create seller account
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {
        body: {},
    });
    
    // Create first profile snapshot with shop name modification
    const snapshot1 = await generate_random_shopping_mall_seller_profile_snapshots_create(sellerConnection, {
        body: {
            shopName: "Original Shop Name",
            logoUrl: "https://example.com/original_logo.png",
        },
    });
    typia.assert(snapshot1);
    
    // Create second profile snapshot with logo URL modification
    const snapshot2 = await generate_random_shopping_mall_seller_profile_snapshots_create(sellerConnection, {
        body: {
            shopName: "Updated Shop Name",
            logoUrl: "https://example.com/updated_logo.png",
        },
    });
    typia.assert(snapshot2);
    
    // Get snapshots filtered by shopName
    const filteredShopName = await api.functional.shoppingMall.seller.profile_snapshots.index(sellerConnection, {
        body: {
            modifiedFields: ["shopName"],
        },
    });
    typia.assert(filteredShopName);
    
    // Verify shopName modified snapshot exists in results
    TestValidator.equals("should contain snapshot with shopName modified", filteredShopName.data.some(snapshot => snapshot.modifiedFieldsSummary.shopName === "Updated Shop Name"), true);
    
    // Get snapshots filtered by logoUrl
    const filteredLogoUrl = await api.functional.shoppingMall.seller.profile_snapshots.index(sellerConnection, {
        body: {
            modifiedFields: ["logoUrl"],
        },
    });
    typia.assert(filteredLogoUrl);
    
    // Verify logoUrl modified snapshot exists in results
    TestValidator.equals("should contain snapshot with logoUrl modified", filteredLogoUrl.data.some(snapshot => snapshot.modifiedFieldsSummary.logoUrl === "https://example.com/updated_logo.png"), true);
}