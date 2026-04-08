import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_product } from "../prepare/prepare_random_ecommerce_product";

/**
 * Generate a random e-commerce product via the API for E2E testing.
 *
 * Prepares random product data using the prepare function, then calls the creation endpoint to create a new product listing for the authenticated seller's shop. The product becomes immediately active and visible in search results and category listings upon creation.
 *
 * This function generates complete product data including name, description, category assignment, base price, and optionally SKU variants and product images. The seller ID is derived from the authentication context and not provided in the request.
 *
 * @param connection The HTTP connection information for the API server
 * @param props Properties containing optional partial product creation data
 * @param props.body Optional partial product creation data to override specific properties
 * @returns The created product with generated UUID, timestamps, and seller/category references
 */
export async function generate_random_ecommerce_seller_products_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceProduct.ICreate> | undefined;
  },
): Promise<IEcommerceProduct> {
  const prepared: IEcommerceProduct.ICreate = prepare_random_ecommerce_product(
    props.body,
  );
  const result: IEcommerceProduct =
    await api.functional.ecommerce.seller.products.create(connection, {
      body: prepared,
    });
  return result;
}
