import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { generate_random_shopping_mall_seller_sales_promotions_create_promotion } from "../../../generate/generate_random_shopping_mall_seller_sales_promotions_create_promotion";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_promotion } from "../../../prepare/prepare_random_shopping_mall_sale_promotion";

export async function test_api_seller_erase_promotion_success_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authorization (Seller A)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuthorized = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: "SellerAShop",
    },
  });
  sellerAConnection.headers = {
    Authorization: `Bearer ${sellerAAuthorized.token.access}`,
  };
  // 2. Seller A creates a new sale
  const saleA = await generate_random_shopping_mall_seller_sales_create(
    sellerAConnection,
    {
      body: {
        name: "Test Sale A",
        description: "Sale description A",
        base_price: 1000,
      },
    },
  );
  typia.assert(saleA);
  // Confirm the sale belongs to sellerA
  TestValidator.equals(
    "Sale seller id matches Seller A",
    saleA.seller.id,
    sellerAAuthorized.id,
  );
  // 3. Seller A adds a promotion to the sale
  const promotionA =
    await generate_random_shopping_mall_seller_sales_promotions_create_promotion(
      sellerAConnection,
      {
        params: { saleId: saleA.id },
        body: {
          promotionCode: "PROMO10",
          promotionType: "percentage",
          description: "10% off",
          discountValue: 10.0,
          discountType: "percentage",
          startAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // started 1 hour ago
          endAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // ends in 1 day
          active: true,
        },
      },
    );
  typia.assert(promotionA);
  // Verify the promotion is linked to saleA
  TestValidator.equals(
    "Promotion sale id matches sale A",
    promotionA.sale.id,
    saleA.id,
  );
  // 4. Seller A deletes the promotion successfully
  await api.functional.shoppingMall.seller.sales.promotions.erasePromotion(
    sellerAConnection,
    {
      saleId: saleA.id,
      promotionId: promotionA.id,
    },
  );
  // 5. Unauthorized deletion attempt - Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuthorized = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: "SellerBShop",
    },
  });
  sellerBConnection.headers = {
    Authorization: `Bearer ${sellerBAuthorized.token.access}`,
  };
  // Seller B creates sale and promotion (not related to Seller A)
  const saleB = await generate_random_shopping_mall_seller_sales_create(
    sellerBConnection,
    {
      body: {
        name: "Test Sale B",
        description: "Sale description B",
        base_price: 2000,
      },
    },
  );
  typia.assert(saleB);
  const promotionB =
    await generate_random_shopping_mall_seller_sales_promotions_create_promotion(
      sellerBConnection,
      {
        params: { saleId: saleB.id },
        body: {
          promotionCode: "PROMO20",
          promotionType: "fixed",
          description: "20 off",
          discountValue: 20.0,
          discountType: "fixed",
          startAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          endAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          active: true,
        },
      },
    );
  typia.assert(promotionB);
  // Seller B attempts to delete promotion created by Seller A (which should fail)
  await TestValidator.httpError(
    "Unauthorized seller cannot delete others' promotion",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sales.promotions.erasePromotion(
        sellerBConnection,
        {
          saleId: saleA.id,
          promotionId: promotionA.id,
        },
      );
    },
  );
  // 6. Deletion attempt of non-existent promotion or sale - Seller A
  const fakeSaleId = typia.random<string & tags.Format<"uuid">>();
  const fakePromotionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Deleting non-existent promotion returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.promotions.erasePromotion(
        sellerAConnection,
        {
          saleId: fakeSaleId,
          promotionId: fakePromotionId,
        },
      );
    },
  );
}
