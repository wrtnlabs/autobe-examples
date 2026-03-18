import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_update_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const existingCategory: IShoppingMallCategory.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    parent: null,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  const beforeProduct: IShoppingMallProduct = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    basePrice: 10000,
    seller: {
      id: typia.random<string & tags.Format<"uuid">>(),
      email: typia.random<string & tags.Format<"email">>(),
      approvalStatus: "approved",
      rejectionReason: null,
      accountStatus: "active",
      approvedAt: new Date().toISOString(),
      rejectedAt: null,
      suspendedAt: null,
      bannedAt: null,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      sellerProfile: {
        id: typia.random<string & tags.Format<"uuid">>(),
        seller: {
          id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string & tags.Format<"email">>(),
          approvalStatus: "approved",
          rejectionReason: null,
          accountStatus: "active",
          approvedAt: new Date().toISOString(),
          rejectedAt: null,
          suspendedAt: null,
          bannedAt: null,
          lastLoginAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          sellerProfile: {
            id: typia.random<string & tags.Format<"uuid">>(),
            seller: null as never,
            shopName: RandomGenerator.name(2),
            shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
            logoImageUrl: "https://example.com/logo.png",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          },
        },
        shopName: RandomGenerator.name(2),
        shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
        logoImageUrl: "https://example.com/logo.png",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
    },
    category: null,
    variants: [],
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  const body = {
    name: `${beforeProduct.name} revised`,
    description: `${beforeProduct.description} revised`,
    basePrice: beforeProduct.basePrice + 1000,
    categoryId: existingCategory.id,
  } satisfies IShoppingMallProduct.IUpdate;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      administratorConnection,
      {
        productId: beforeProduct.id,
        body,
      },
    );
  typia.assert(updatedProduct);
  TestValidator.equals(
    "updated product id",
    updatedProduct.id,
    beforeProduct.id,
  );
  TestValidator.equals(
    "seller preserved",
    updatedProduct.seller.id,
    beforeProduct.seller.id,
  );
  TestValidator.equals(
    "seller email preserved",
    updatedProduct.seller.email,
    beforeProduct.seller.email,
  );
  TestValidator.equals("product name updated", updatedProduct.name, body.name);
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    body.description,
  );
  TestValidator.equals(
    "product base price updated",
    updatedProduct.basePrice,
    body.basePrice,
  );
  TestValidator.equals(
    "product category reassigned",
    updatedProduct.category?.id,
    existingCategory.id,
  );
  TestValidator.notEquals(
    "product should change after admin update",
    updatedProduct,
    beforeProduct,
    (key) => key === "updatedAt",
  );
}
