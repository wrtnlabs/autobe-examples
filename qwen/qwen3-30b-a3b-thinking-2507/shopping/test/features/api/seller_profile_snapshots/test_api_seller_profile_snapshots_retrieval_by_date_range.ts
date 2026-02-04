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
export async function test_api_seller_profile_snapshots_retrieval_by_date_range(connection: api.IConnection) {
    // 1. Create seller account
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
        body: {
            shopName: RandomGenerator.name(),
            logoUrl: RandomGenerator.paragraph({ sentences: 1 }),
        }
    });
    // 2. Create multiple profile snapshots at different dates
    const snapshot1 = await generate_random_shopping_mall_seller_profile_snapshots_create(sellerConnection, {
        body: {
            shopName: RandomGenerator.name(),
            logoUrl: RandomGenerator.paragraph({ sentences: 1 }),
        }
    });
    // Add 5 minutes to the timestamp for snapshot2
    const snapshot2 = await generate_random_shopping_mall_seller_profile_snapshots_create(sellerConnection, {
        body: {
            shopName: RandomGenerator.name(),
            logoUrl: RandomGenerator.paragraph({ sentences: 1 }),
        }
    });
    // Add 1 day to the timestamp for snapshot3
    const snapshot3 = await generate_random_shopping_mall_seller_profile_snapshots_create(sellerConnection, {
        body: {
            shopName: RandomGenerator.name(),
            logoUrl: RandomGenerator.paragraph({ sentences: 1 }),
        }
    });
    // 3. Retrieve snapshots within a date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 2);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 2);
    const snapshots = await api.functional.shoppingMall.seller.profile_snapshots.index(sellerConnection, {
        body: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        }
    });
    typia.assert(snapshots);
    // 4. Validate that the snapshots within the date range were retrieved
    TestValidator.equals("All snapshots should be retrieved", snapshots.data.length, 3);
    const expectedSnapshotIds = [snapshot1.id, snapshot2.id, snapshot3.id].sort();
    const actualSnapshotIds = snapshots.data.map(s => s.id).sort();
    TestValidator.equals("Snapshot IDs match expectations", actualSnapshotIds, expectedSnapshotIds);
}