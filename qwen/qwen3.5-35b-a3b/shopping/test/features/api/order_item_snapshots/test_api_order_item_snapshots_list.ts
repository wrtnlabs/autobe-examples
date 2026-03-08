import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_order_item_snapshots_list(connection: api.IConnection): Promise<void> {
    // 1. Seller setup via join utility
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuthorized = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceMallSeller.IJoin,
    });
    typia.assert(sellerAuthorized);
    // 2. Query orderItemSnapshots without filters
    const snapshots = await api.functional.ecommerceMall.seller
        .orderItemSnapshots.index(sellerConnection, {
        body: {} satisfies IEcommerceMallOrderItemSnapshot.IRequest,
    });
    typia.assert(snapshots);
    // 3. Verify pagination metadata structure
    TestValidator.equals("pagination has current page", snapshots.pagination.current, 1);
    TestValidator.equals("pagination has limit", snapshots.pagination.limit, 20);
    TestValidator.equals("pagination records matches data length", snapshots.pagination.records, snapshots.data.length);
    TestValidator.equals("pagination pages calculated correctly", snapshots.pagination.pages, snapshots.pagination.records === 0
        ? 0
        : Math.ceil(snapshots.pagination.records / snapshots.pagination.limit));
    // 4. Verify data array exists and is array type
    TestValidator.equals("data is array type", Array.isArray(snapshots.data), true);
    // 5. Verify each snapshot has required fields (if any exist)
    if (snapshots.data.length > 0) {
        for (const snapshot of snapshots.data) {
            typia.assert(snapshot);
            TestValidator.predicate("snapshot has valid id format", snapshot.id.length > 0);
            TestValidator.predicate("snapshot has old_status", snapshot.old_status.length > 0);
            TestValidator.predicate("snapshot has new_status", snapshot.new_status.length > 0);
            TestValidator.predicate("snapshot has created_at", snapshot.created_at.length > 0);
            // changed_by_seller_id is optional in ISummary but should match seller if present
            if (snapshot.changed_by_seller_id) {
                TestValidator.equals("snapshot changed_by_seller_id matches seller", snapshot.changed_by_seller_id, sellerAuthorized.id);
            }
        }
    }
    // 6. Verify change_reason is nullable (can be undefined, null, or string)
    if (snapshots.data.length > 0) {
        const snapshot = snapshots.data[0];
        typia.assert(snapshot);
        // change_reason can be string | null | undefined
        TestValidator.predicate("change_reason is valid type", snapshot.change_reason === null ||
            snapshot.change_reason === undefined ||
            typeof snapshot.change_reason === "string");
    }
}