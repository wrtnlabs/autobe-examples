import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_seller_promotions_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // Seller joins and gets authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass1234!",
      shopName: "Test Shop",
      shopDescription: "A test shop for promotions update",
      logoUri: null,
    },
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product for Sale",
        description: "Description for Test Product",
        base_price: typia.random<
          number & tags.Type<"float"> & tags.Minimum<0>
        >(),
        product_subcategory_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // Seller creates a sale listing for the product
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: "Test Sale for Promotions",
        description: "Sale description",
        base_price: product.basePrice,
      },
    },
  );
  typia.assert(sale);
  // Prepare promotion update data
  const promotionUpdate: IShoppingMallSale.IPromotionUpdate = {
    discountPercentage: 15,
    startDate: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours from now
    active: true,
    conditions: "Limited time promotion",
    title: "Summer Sale",
  };
  // Seller updates promotions
  const updatedRaw =
    await api.functional.shoppingMall.seller.sales.promotions.updatePromotions(
      sellerConnection,
      {
        saleId: sale.id,
        body: promotionUpdate,
      },
    );
  // Assert typed as IShoppingMallSale
  const updatedSale = typia.assert<IShoppingMallSale>(updatedRaw);
  // Validate that returned sale is same ID and status change expected
  TestValidator.equals("sale ID unchanged", updatedSale.id, sale.id);
  TestValidator.predicate(
    "promotion active status",
    updatedSale.status === "active" ||
      updatedSale.status === "approved" ||
      updatedSale.status === "pending",
  );
  // Unauthorized seller connection
  const unauthorizedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedSellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass4321!",
      shopName: "Unauthorized Shop",
      shopDescription: "Another seller",
      logoUri: null,
    },
  });
  typia.assert(unauthorizedSellerAuth);
  unauthorizedSellerConnection.headers = {
    Authorization: `Bearer ${unauthorizedSellerAuth.token.access}`,
  };
  // Attempt update as unauthorized seller, expect error
  await TestValidator.error("unauthorized promotion update", async () => {
    await api.functional.shoppingMall.seller.sales.promotions.updatePromotions(
      unauthorizedSellerConnection,
      {
        saleId: sale.id,
        body: { ...promotionUpdate, discountPercentage: 30 },
      },
    );
  });
  // Re-update promotions with different values
  const secondPromotionUpdate: IShoppingMallSale.IPromotionUpdate = {
    discountPercentage: 5,
    startDate: null,
    endDate: null,
    active: false,
    conditions: null,
    title: null,
  };
  const secondUpdatedRaw =
    await api.functional.shoppingMall.seller.sales.promotions.updatePromotions(
      sellerConnection,
      {
        saleId: sale.id,
        body: secondPromotionUpdate,
      },
    );
  const secondUpdatedSale = typia.assert<IShoppingMallSale>(secondUpdatedRaw);
  TestValidator.equals(
    "sale ID unchanged again",
    secondUpdatedSale.id,
    sale.id,
  );
  TestValidator.predicate(
    "promotion inactive status",
    secondUpdatedSale.status === "inactive" ||
      secondUpdatedSale.status === "approved" ||
      secondUpdatedSale.status === "pending",
  );
}
