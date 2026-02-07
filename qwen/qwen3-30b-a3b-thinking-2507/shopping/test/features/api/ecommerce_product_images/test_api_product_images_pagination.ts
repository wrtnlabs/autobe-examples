import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductImage";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
export async function test_api_product_images_pagination(connection: api.IConnection): Promise<void> {
    const adminConnection: api.IConnection = { host: connection.host };
    const category = await generate_random_ecommerce_categories_create(adminConnection, {});
    const product = await generate_random_ecommerce_products_create(adminConnection, {
        body: {
            categoriesId: category.id,
        }
    });
    const firstPage = await api.functional.ecommerce.products.images.index(adminConnection, {
        productId: product.id,
        body: {
            page: 1,
            size: 10,
        }
    });
    typia.assert(firstPage);
    TestValidator.equals("should return 10 images on first page", firstPage.data.length, 10);
    TestValidator.equals("total images count should be 11", firstPage.pagination.records, 11);
    TestValidator.equals("total pages calculated correctly", firstPage.pagination.pages, 2);
    const secondPage = await api.functional.ecommerce.products.images.index(adminConnection, {
        productId: product.id,
        body: {
            page: 2,
            size: 10,
        }
    });
    typia.assert(secondPage);
    TestValidator.equals("should return 1 image on second page", secondPage.data.length, 1);
}