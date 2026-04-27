import api from "@ORGANIZATION/PROJECT-api";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_product } from "../prepare/prepare_random_ecommerce_mall_product";

/**
 * Generate a random e-commerce mall product for E2E testing.
 *
 * Prepares random product creation data using the prepare function, then sends a
 * POST request to the creation endpoint to persist the product on the platform.
 * The authenticated seller must have an 'approved' approval status; sellers with
 * 'pending' or 'rejected' status cannot create products. After creation, the
 * seller can add variants, upload images, and manage inventory through separate
 * endpoints. A product must have at least one variant before it can be purchased
 * by customers.
 *
 * The newly created product is immediately visible in search results and category
 * listings with 'visible' visibility. The product's base price serves as the
 * default price displayed on listing pages.
 *
 * @param connection The API connection configuration including host and headers
 * @param props.body Optional partial input to override specific generated fields
 * @returns The newly created product entity with all system-generated fields
 *          (id, created_at, updated_at) populated
 */
export async function generate_random_e_commerce_mall_seller_products_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallProduct.ICreate> | undefined;
  },
): Promise<IECommerceMallProduct> {
  const prepared: IECommerceMallProduct.ICreate =
    prepare_random_ecommerce_mall_product(props.body);
  return await api.functional.eCommerceMall.seller.products.create(connection, {
    body: prepared,
  });
}
