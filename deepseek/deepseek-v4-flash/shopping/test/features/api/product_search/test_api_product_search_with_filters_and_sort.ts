import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_search_with_filters_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup ----
  // 1. Admin joins
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: "Test Search Shop",
    },
  });
  typia.assert(seller);
  // 3. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 4. Seller creates three products with distinct names and prices
  const productHeadphones =
    await generate_random_e_commerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: "Wireless Headphones Pro",
          description: "Premium wireless headphones with noise cancellation",
          base_price: 150,
        },
      },
    );
  typia.assert(productHeadphones);
  const productSpeaker =
    await generate_random_e_commerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: "Bluetooth Speaker Max",
          description: "Portable bluetooth speaker with deep bass",
          base_price: 80,
        },
      },
    );
  typia.assert(productSpeaker);
  const productTShirt =
    await generate_random_e_commerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: "Cotton T-Shirt",
          description: "Comfortable cotton t-shirt",
          base_price: 25,
        },
      },
    );
  typia.assert(productTShirt);
  // 5. Add variants to each product
  const variantHeadphones =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productHeadphones.id },
        body: {
          sku_code: "HP-001",
          price: 150,
          options: [
            { key: "color", value: "Black" },
          ] satisfies IECommerceMallProductVariant.IOption[],
        },
      },
    );
  typia.assert(variantHeadphones);
  const variantSpeaker =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productSpeaker.id },
        body: {
          sku_code: "SPK-001",
          price: 80,
          options: [
            { key: "color", value: "Blue" },
          ] satisfies IECommerceMallProductVariant.IOption[],
        },
      },
    );
  typia.assert(variantSpeaker);
  const variantTShirt =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productTShirt.id },
        body: {
          sku_code: "TSH-001",
          price: 25,
          options: [
            { key: "size", value: "M" },
          ] satisfies IECommerceMallProductVariant.IOption[],
        },
      },
    );
  typia.assert(variantTShirt);
  // 6. Add inventory to variants
  const inventoryHP =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: productHeadphones.id,
          variantId: variantHeadphones.id,
        },
        body: {
          quantity_change: 50,
          reason: "Seller restock",
        } satisfies IECommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryHP);
  const inventorySPK =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: productSpeaker.id,
          variantId: variantSpeaker.id,
        },
        body: {
          quantity_change: 30,
          reason: "Seller restock",
        } satisfies IECommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventorySPK);
  const inventoryTSH =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: productTShirt.id,
          variantId: variantTShirt.id,
        },
        body: {
          quantity_change: 100,
          reason: "Seller restock",
        } satisfies IECommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryTSH);
  // ---- Test Steps ----
  // A. Search by partial name 'head' -
  // should match 'Wireless Headphones Pro'
  const searchHead = await api.functional.eCommerceMall.customer.products.index(
    customerConnection,
    {
      body: {
        search: "head",
        limit: 10,
      } satisfies IECommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchHead);
  TestValidator.predicate(
    "search 'head' returns only matching products via ILIKE",
    () =>
      searchHead.data.length > 0 &&
      searchHead.data.every((p) => p.name.toLowerCase().includes("head")),
  );
  // B. All visible products returned without any filter
  const allProducts =
    await api.functional.eCommerceMall.customer.products.index(
      customerConnection,
      {
        body: {
          limit: 10,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(allProducts);
  TestValidator.predicate(
    "all three products returned without filters",
    () => allProducts.data.length >= 3,
  );
  // C. Price range filter: minPrice=10, maxPrice=100
  const midPriceProducts =
    await api.functional.eCommerceMall.customer.products.index(
      customerConnection,
      {
        body: {
          minPrice: 10,
          maxPrice: 100,
          limit: 10,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(midPriceProducts);
  TestValidator.predicate(
    "price range 10-100 returns products with matching base_price",
    () =>
      midPriceProducts.data.length > 0 &&
      midPriceProducts.data.every(
        (p) => p.base_price >= 10 && p.base_price <= 100,
      ),
  );
  // D. inStockOnly=true - only products with positive stock
  const inStockProducts =
    await api.functional.eCommerceMall.customer.products.index(
      customerConnection,
      {
        body: {
          inStockOnly: true,
          limit: 10,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(inStockProducts);
  TestValidator.predicate(
    "inStockOnly returns only products that have stock",
    () => inStockProducts.data.length > 0,
  );
  // E. Sort by price_asc
  const priceAsc = await api.functional.eCommerceMall.customer.products.index(
    customerConnection,
    {
      body: {
        sort: "price_asc" as const,
        limit: 10,
      } satisfies IECommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceAsc);
  for (let i = 1; i < priceAsc.data.length; i++) {
    TestValidator.predicate(
      "price ascending order",
      () => priceAsc.data[i - 1].base_price <= priceAsc.data[i].base_price,
    );
  }
  // F. Sort by price_desc
  const priceDesc = await api.functional.eCommerceMall.customer.products.index(
    customerConnection,
    {
      body: {
        sort: "price_desc" as const,
        limit: 10,
      } satisfies IECommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceDesc);
  for (let i = 1; i < priceDesc.data.length; i++) {
    TestValidator.predicate(
      "price descending order",
      () => priceDesc.data[i - 1].base_price >= priceDesc.data[i].base_price,
    );
  }
  // G. Sort by newest (created_at descending)
  const newestFirst =
    await api.functional.eCommerceMall.customer.products.index(
      customerConnection,
      {
        body: {
          sort: "newest" as const,
          limit: 10,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(newestFirst);
  for (let i = 1; i < newestFirst.data.length; i++) {
    TestValidator.predicate(
      "newest first (created_at descending)",
      () =>
        new Date(newestFirst.data[i - 1].created_at) >=
        new Date(newestFirst.data[i].created_at),
    );
  }
  // H. Combine search + price range filter simultaneously
  const combinedFilter =
    await api.functional.eCommerceMall.customer.products.index(
      customerConnection,
      {
        body: {
          search: "wireless",
          minPrice: 50,
          maxPrice: 200,
          limit: 10,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined search and price filter returns matching products",
    () =>
      combinedFilter.data.length > 0 &&
      combinedFilter.data.every(
        (p) =>
          p.name.toLowerCase().includes("wireless") &&
          p.base_price >= 50 &&
          p.base_price <= 200,
      ),
  );
}
