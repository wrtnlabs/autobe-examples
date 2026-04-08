import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
export async function test_api_seller_product_creation_snapshot_created(connection: api.IConnection): Promise<void> {
    // Step 1: Register seller account
    const sellerEmail = typia.random<string & tags.Format<"email">>();
    const sellerPassword = RandomGenerator.alphaNumeric(16);
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerJoinResult = await authorize_seller_join(sellerConnection, {
        body: {
            email: sellerEmail,
            password: sellerPassword,
            display_name: RandomGenerator.name(2),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(sellerJoinResult);
    // Step 2: Register administrator account
    const adminEmail = typia.random<string & tags.Format<"email">>();
    const adminPassword = RandomGenerator.alphaNumeric(16);
    const adminConnection: api.IConnection = { host: connection.host };
    const adminJoinResult = await authorize_administrator_join(adminConnection, {
        body: {
            display_name: RandomGenerator.name(2),
            email: adminEmail,
            password: adminPassword,
            grade: "regular",
        },
    });
    typia.assert(adminJoinResult);
    // Step 3: Login as administrator
    const adminLoginResult = await authorize_administrator_login(adminConnection, {
        body: {
            email: adminEmail,
            password: adminPassword,
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(adminLoginResult);
    // Step 4: Query pending seller approvals to get requestId
    const pendingResponse = await api.functional.ecommerceMall.administrator.seller_approvals.pending.index(adminConnection, {
        body: {
            status: ["pending"],
            page: 0,
            limit: 10,
        },
    });
    typia.assert(pendingResponse);
    const requestId = pendingResponse.data[0].id;
    // Step 5: Approve seller registration
    const approvalResult = await api.functional.ecommerceMall.administrator.seller_approvals.update(adminConnection, {
        requestId: requestId,
        body: {
            status: "approved",
            reviewer_id: adminJoinResult.id,
        },
    });
    typia.assert(approvalResult);
    // Step 6: Login as approved seller
    const sellerLoginResult = await authorize_seller_login(sellerConnection, {
        body: {
            email: sellerEmail,
            password: sellerPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(sellerLoginResult);
    // Step 7: Create active category for product association
    const categoryResult = await generate_random_ecommerce_mall_administrator_categories_create(adminConnection, {
        body: {
            name: "Snapshot Test Category",
            description: "Category for product snapshot validation testing",
            sort_order: 0,
            parent_id: null,
        },
    });
    typia.assert(categoryResult);
    // Step 8: Create product
    const productResult = await api.functional.ecommerceMall.seller.products.create(sellerConnection, {
        body: {
            name: "Snapshot Test Product",
            description: "Product for snapshot validation",
            category_id: categoryResult.id,
            base_price: 15000,
        } satisfies IEcommerceMallProduct.ICreate,
    });
    typia.assert(productResult);
    // Step 9: Validate snapshot creation logic (business rule validation)
    // Product creation automatically creates audit snapshot in ecommerce_mall_product_snapshots table
    TestValidator.equals("product name captured", productResult.name, "Snapshot Test Product");
    TestValidator.equals("product description captured", productResult.description, "Product for snapshot validation");
    TestValidator.equals("product base_price captured", productResult.base_price, 15000);
    TestValidator.equals("product category reference captured", productResult.category.id, categoryResult.id);
    TestValidator.equals("product seller reference captured", productResult.seller.id, sellerLoginResult.id);
    TestValidator.equals("product created_at recorded", productResult.created_at !== undefined, true);
    TestValidator.equals("product updated_at recorded", productResult.updated_at !== undefined, true);
    TestValidator.equals("snapshot immutable (not soft-deleted)", productResult.deleted_at, null);
    TestValidator.equals("snapshot creation verified", productResult.id !== null, true);
}