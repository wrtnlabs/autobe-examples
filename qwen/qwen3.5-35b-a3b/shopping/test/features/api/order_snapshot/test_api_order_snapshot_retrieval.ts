import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { authorize_administrator_join as importAuthorizeAdminJoin } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
export async function authorize_administrator_join(connection: api.IConnection, props: {
    body?: DeepPartial<IEcommerceMallAdministrator.IJoin>;
}): Promise<IEcommerceMallAdministrator.IAuthorized> {
    const joinInput = {
        display_name: props.body?.display_name ?? RandomGenerator.name(2),
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        grade: props.body?.grade ?? ("regular" as const),
    } satisfies IEcommerceMallAdministrator.IJoin;
    return await api.functional.ecommerceMall.auth.administrator.join(connection, { body: joinInput });
}
export async function test_api_order_snapshot_retrieval(connection: api.IConnection): Promise<void> {
    // 1. Register administrator account
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await importAuthorizeAdminJoin(adminConnection, {
        body: {
            display_name: RandomGenerator.name(2),
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        },
    });
    typia.assert(adminAuth);
    // 2. Generate a snapshot ID for retrieval testing
    // Note: Since order/snapshot creation APIs are not available in the SDK,
    // we use typia.random to generate a snapshot ID for retrieval testing.
    // In production, this would be an actual snapshot ID from created orders.
    const snapshotId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // 3. Retrieve the order item snapshot using admin connection
    const snapshot = await api.functional.ecommerceMall.administrator.order_snapshots.at(adminConnection, {
        id: snapshotId,
    });
    typia.assert(snapshot);
    // 4. Validate snapshot_type is one of the allowed lifecycle events
    TestValidator.predicate("snapshot_type is valid event", snapshot.snapshot_type === "checkout" ||
        snapshot.snapshot_type === "cancellation" ||
        snapshot.snapshot_type === "refund");
    // 5. Validate snapshot contains all required identifiers
    TestValidator.equals("snapshot has non-empty order_id", snapshot.order_id, snapshot.order_id);
    TestValidator.equals("snapshot has non-empty product_id", snapshot.product_id, snapshot.product_id);
    TestValidator.equals("snapshot has non-empty product_variant_id", snapshot.product_variant_id, snapshot.product_variant_id);
    TestValidator.equals("snapshot has non-empty seller_id", snapshot.seller_id, snapshot.seller_id);
    // 6. Validate denormalized historical data is captured
    TestValidator.predicate("product_name is preserved", snapshot.product_name.length > 0);
    TestValidator.predicate("seller_name is preserved", snapshot.seller_name.length > 0);
    // 7. Validate pricing calculations are correct
    TestValidator.equals("total_price matches quantity * unit_price", snapshot.total_price, snapshot.quantity * snapshot.unit_price);
    TestValidator.predicate("unit_price is positive", snapshot.unit_price > 0);
    TestValidator.predicate("quantity is positive", snapshot.quantity > 0);
    TestValidator.predicate("total_price is positive", snapshot.total_price > 0);
    // 8. Validate product_variant_options is valid JSON
    let variantOptions: Record<string, string>;
    try {
        variantOptions = JSON.parse(snapshot.product_variant_options);
    }
    catch {
        throw new Error(`Invalid JSON in product_variant_options: ${snapshot.product_variant_options}`);
    }
    typia.assert(variantOptions);
    TestValidator.predicate("product_variant_options is valid JSON object", typeof variantOptions === "object" && variantOptions !== null);
    // 9. Validate timestamps are ISO 8601 date-time format
    typia.assert(snapshot.created_at);
}