import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

export async function test_api_cart_item_isolation_after_failed_update(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productId: string = typia.random<string & tags.Format<"uuid">>();
  const variantA =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: "Color: Red / Size: M",
          priceOverride: 1000,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variantA);
  const variantB =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: "Color: Blue / Size: L",
          priceOverride: 2000,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variantB);
  const variantAId = (variantA as IMallPlatformProductVariant & { id: string }).id;
  const variantBId = (variantB as IMallPlatformProductVariant & { id: string }).id;
  const cartId: string = typia.random<string & tags.Format<"uuid">>();
  const firstUpdate =
    await api.functional.mallPlatform.customer.carts.items.index(
      customerConnection,
      {
        cartId,
        body: {
          mallPlatformProductVariantId: variantAId,
          quantity: 1,
        } satisfies IMallPlatformCartItem.IRequest,
      },
    );
  typia.assert(firstUpdate);
  const secondUpdate =
    await api.functional.mallPlatform.customer.carts.items.index(
      customerConnection,
      {
        cartId,
        body: {
          mallPlatformProductVariantId: variantBId,
          quantity: 1,
        } satisfies IMallPlatformCartItem.IRequest,
      },
    );
  typia.assert(secondUpdate);
  const baselineLines = secondUpdate.data.map((item) => ({
    variantId: item.productVariant.id,
    skuCode: item.productVariant.skuCode,
    quantity: item.quantity,
    availabilityState: item.availabilityState,
  }));
  const baselineTotal = secondUpdate.data.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  await TestValidator.error(
    "failed cart item update should not mutate other cart lines",
    async () => {
      await api.functional.mallPlatform.customer.carts.items.index(
        customerConnection,
        {
          cartId,
          body: {
            mallPlatformProductVariantId: variantAId,
            quantity: 999999,
          } satisfies IMallPlatformCartItem.IRequest,
        },
      );
    },
  );
  const afterFailedUpdate =
    await api.functional.mallPlatform.customer.carts.items.index(
      customerConnection,
      {
        cartId,
        body: {
          mallPlatformProductVariantId: variantBId,
          quantity: 1,
        } satisfies IMallPlatformCartItem.IRequest,
      },
    );
  typia.assert(afterFailedUpdate);
  TestValidator.equals(
    "cart lines remain unchanged after failed update",
    afterFailedUpdate.data.map((item) => ({
      variantId: item.productVariant.id,
      skuCode: item.productVariant.skuCode,
      quantity: item.quantity,
      availabilityState: item.availabilityState,
    })),
    baselineLines,
  );
  TestValidator.equals(
    "cart total remains unchanged after failed update",
    afterFailedUpdate.data.reduce((sum, item) => sum + item.quantity, 0),
    baselineTotal,
  );
}
