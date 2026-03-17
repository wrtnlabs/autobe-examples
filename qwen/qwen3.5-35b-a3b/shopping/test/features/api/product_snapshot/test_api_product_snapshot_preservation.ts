import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { authorize_seller_join as import_join_seller } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function authorize_seller_join(connection: api.IConnection, props: {
    body?: DeepPartial<IEcommerceMallSeller.IJoin>;
}): Promise<IEcommerceMallSeller.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin;
    return await api.functional.ecommerceMall.auth.seller.join(connection, {
        body: joinInput,
    });
}
export async function test_api_product_snapshot_preservation(connection: api.IConnection): Promise<void> {
    // 1. Seller registration
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await import_join_seller(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(seller);
    // 2. Retrieve product snapshot (uses sellerConnection with updated headers from authorize)
    const snapshotId = typia.random<string & tags.Format<"uuid">>();
    const productId = typia.random<string & tags.Format<"uuid">>();
    const snapshot = await api.functional.ecommerceMall.seller.products.snapshots.at(sellerConnection, {
        productId,
        snapshotId,
    });
    typia.assert(snapshot);
    // 3. Validate snapshot structure and data integrity
    TestValidator.equals("snapshot has id", snapshot.id !== undefined, true);
    TestValidator.equals("snapshot has product reference", snapshot.product !== undefined, true);
    TestValidator.equals("snapshot has name", snapshot.name.length > 0, true);
    TestValidator.equals("snapshot has slug", snapshot.slug.length > 0, true);
    TestValidator.equals("snapshot has base price", snapshot.base_price > 0, true);
    TestValidator.equals("snapshot has status", snapshot.status.length > 0, true);
    TestValidator.equals("snapshot has created_at", snapshot.created_at !== undefined, true);
    TestValidator.equals("snapshot has updated_at", snapshot.updated_at !== undefined, true);
    // 4. Validate nullable fields are properly handled
    TestValidator.equals("description is string or null", snapshot.description === null || typeof snapshot.description === "string", true);
    TestValidator.equals("sale_price is number or null", snapshot.sale_price === null || typeof snapshot.sale_price === "number", true);
    TestValidator.equals("tags is string or null", snapshot.tags === null || typeof snapshot.tags === "string", true);
}