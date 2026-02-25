import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDataSnapshot";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceDataSnapshot";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
export async function test_api_data_snapshot_specific_entity_tracking(connection: api.IConnection): Promise<void> {
    // 1. Administrator setup
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_administrator_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "admin_password",
        },
    });
    // 2. Seller setup
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerJoinBody = {
        email: typia.random<string & tags.Format<"email">>(),
        password: "seller_password",
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: typia.random<string & tags.Format<"uri">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin;
    await authorize_seller_join(sellerConnection, { body: sellerJoinBody });
    // 3. Create initial product
    const productCreateBody = {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 3,
        }),
        base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IEcommerceProduct.ICreate;
    const product = await generate_random_ecommerce_seller_products_create(sellerConnection, { body: productCreateBody });
    typia.assert(product);
    // 4. Perform two modifications to generate additional snapshots
    const firstUpdateBody = {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 3,
        }),
    } satisfies IEcommerceProduct.IUpdate;
    const updatedProduct1 = await api.functional.ecommerce.seller.products.update(sellerConnection, {
        productId: product.id,
        body: firstUpdateBody,
    });
    typia.assert(updatedProduct1);
    const secondUpdateBody = {
        base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<2000>>(),
    } satisfies IEcommerceProduct.IUpdate;
    const updatedProduct2 = await api.functional.ecommerce.seller.products.update(sellerConnection, {
        productId: product.id,
        body: secondUpdateBody,
    });
    typia.assert(updatedProduct2);
    // 5. Query snapshots for this specific product entity
    // Use proper tagged type approach instead of satisfies pattern
    const snapshotRequest: IEcommerceDataSnapshot.IRequest = {
        entity_type: "product",
        entity_ids: [product.id],
        // page and limit are optional with defaults, so we can omit them
        // or use tagged type generation if needed
    };
    const snapshotPage = await api.functional.ecommerce.administrator.data_snapshots.index(adminConnection, { body: snapshotRequest });
    typia.assert(snapshotPage);
    // 6. Validate snapshot results
    TestValidator.predicate("should have at least one snapshot for product modifications", snapshotPage.data.length >= 1);
    // Verify chronological ordering (newest first)
    for (let i = 0; i < snapshotPage.data.length - 1; i++) {
        const current = new Date(snapshotPage.data[i].created_at);
        const next = new Date(snapshotPage.data[i + 1].created_at);
        TestValidator.predicate(`snapshot ${i} should be newer than or equal to snapshot ${i + 1}`, current >= next);
    }
    // Verify entity filtering accuracy
    for (const snapshot of snapshotPage.data) {
        TestValidator.equals(`snapshot ${snapshot.id} should be for product entity`, snapshot.entity_type, "product");
        TestValidator.equals(`snapshot ${snapshot.id} should be for our test product`, snapshot.entity_id, product.id);
        TestValidator.predicate(`snapshot ${snapshot.id} should have change description`, snapshot.change_description.length > 0);
    }
    // Verify pagination metadata (if we have data)
    if (snapshotPage.data.length > 0) {
        TestValidator.predicate("should have valid pagination data", snapshotPage.pagination.records >= snapshotPage.data.length &&
            snapshotPage.pagination.limit > 0);
    }
}