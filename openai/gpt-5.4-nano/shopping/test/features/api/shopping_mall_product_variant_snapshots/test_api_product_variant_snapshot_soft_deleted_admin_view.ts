import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_variant_snapshot_soft_deleted_admin_view(
    connection: api.IConnection,
): Promise<void> {
    // 1) Register an admin and obtain authorization tokens.
    const adminConnection: api.IConnection = { host: connection.host };
    const adminEmail = `${RandomGenerator.name()}+${RandomGenerator.alphabets(8)}@example.com`;

    await authorize_admin_join(adminConnection, {
        body: {
            email: adminEmail as string & tags.Format<"email">,
            password: `P@ssw0rd-${RandomGenerator.alphabets(10)}` as string & tags.Format<"password">,
        } satisfies IShoppingMallAdmin.IJoin,
    });

    // 2) Find an existing productVariantSnapshotId whose deleted_at is non-null.
    // We don't have a listing API in the provided SDK/utilities, so we retry by sampling UUIDs.
    const maxAttempts = 20;
    let snapshot: IShoppingMallProductVariantSnapshot | null = null;

    const functional = api.functional;
    const shoppingMall = functional.shoppingMall;
    const admin = shoppingMall.admin;
    const productVariantSnapshots = admin.productVariantSnapshots;

    for (let i = 0; i < maxAttempts; i++) {
        try {
            const candidateId = typia.random<string & tags.Format<"uuid">>();
            const output = await productVariantSnapshots.at(adminConnection, {
                productVariantSnapshotId: candidateId,
            });

            const asserted = typia.assert<IShoppingMallProductVariantSnapshot>(output);
            if (asserted.deleted_at !== null) {
                snapshot = asserted;
                break;
            }
        } catch {
            // Ignore 404/authorization failures and try another candidate.
        }
    }

    if (snapshot === null) {
        throw new Error(
            "Unable to find a soft-deleted productVariantSnapshotId (deleted_at != null) within attempts; ensure test data contains at least one soft-deleted snapshot.",
        );
    }

    // 3) Call GET /shoppingMall/admin/productVariantSnapshots/{productVariantSnapshotId} as admin.
    const output = await productVariantSnapshots.at(adminConnection, {
        productVariantSnapshotId: snapshot.id,
    });

    const asserted = typia.assert<IShoppingMallProductVariantSnapshot>(output);

    // 4) Validate response.
    TestValidator.notEquals("deleted_at should be non-null for soft-deleted snapshots", asserted.deleted_at, null);
    TestValidator.predicate(
        "deleted_at is valid ISO date-time",
        asserted.deleted_at !== null && typia.is<string & tags.Format<"date-time">>(asserted.deleted_at),
    );
    TestValidator.predicate("code is present", asserted.code.length > 0);
    TestValidator.predicate("name is present", asserted.name.length > 0);
    TestValidator.predicate("price is finite", Number.isFinite(asserted.price));
    TestValidator.predicate("currency is present", asserted.currency.length > 0);
    TestValidator.predicate("is_available is boolean", typeof asserted.is_available === "boolean");
    TestValidator.predicate("variant_status is present", asserted.variant_status.length > 0);

    // 5) Validate historical payload from the snapshot record.
    TestValidator.equals("snapshot id matches", asserted.id, snapshot.id);
    TestValidator.equals(
        "shopping_mall_product_variant_id matches",
        asserted.shopping_mall_product_variant_id,
        snapshot.shopping_mall_product_variant_id,
    );
    TestValidator.equals("code matches", asserted.code, snapshot.code);
    TestValidator.equals("name matches", asserted.name, snapshot.name);
    TestValidator.equals("price matches", asserted.price, snapshot.price);
    TestValidator.equals("currency matches", asserted.currency, snapshot.currency);
    TestValidator.equals("is_available matches", asserted.is_available, snapshot.is_available);
    TestValidator.equals("variant_status matches", asserted.variant_status, snapshot.variant_status);
    TestValidator.equals("created_at matches", asserted.created_at, snapshot.created_at);
    TestValidator.equals("updated_at matches", asserted.updated_at, snapshot.updated_at);
    TestValidator.equals("deleted_at matches", asserted.deleted_at, snapshot.deleted_at);
}
