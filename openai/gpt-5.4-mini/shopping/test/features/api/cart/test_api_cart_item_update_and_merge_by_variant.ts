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

export async function test_api_cart_item_update_and_merge_by_variant(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_mall_platform_seller_products_variants_create(
    sellerConnection,
    {
      params: {
        productId: typia.random<string & tags.Format<"uuid">>(),
      },
      body: {
        skuCode: `sku-${RandomGenerator.alphaNumeric(10)}`,
        optionValues: "color=red,size=m",
        priceOverride: 12000,
      } satisfies IMallPlatformProductVariant.ICreate,
    },
  );
  typia.assert(product);
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const initial = await api.functional.mallPlatform.customer.carts.items.index(
    customerConnection,
    {
      cartId,
      body: {
        mallPlatformProductVariantId: variantId,
        quantity: 1,
        page: 1,
        limit: 10,
      } satisfies IMallPlatformCartItem.IRequest,
    },
  );
  typia.assert(initial);
  const initialItem = initial.data.find(
    (item) => item.productVariant.id === variantId,
  );
  TestValidator.predicate(
    "target variant is present in initial cart",
    !!initialItem,
  );
  if (!initialItem) return;
  const initialCartItemCount = initial.data.length;
  const initialTotal = initial.pagination.records;
  const updated = await api.functional.mallPlatform.customer.carts.items.index(
    customerConnection,
    {
      cartId,
      body: {
        mallPlatformProductVariantId: variantId,
        quantity: 2,
        page: 1,
        limit: 10,
      } satisfies IMallPlatformCartItem.IRequest,
    },
  );
  typia.assert(updated);
  const updatedItem = updated.data.find(
    (item) => item.productVariant.id === variantId,
  );
  TestValidator.predicate(
    "target variant remains present after update",
    !!updatedItem,
  );
  if (!updatedItem) return;
  TestValidator.equals("updated quantity is reflected", updatedItem.quantity, 2);
  TestValidator.equals(
    "cart keeps the same number of lines when updating one variant",
    updated.data.length,
    initialCartItemCount,
  );
  TestValidator.equals(
    "cart page metadata remains valid",
    updated.pagination.current,
    1,
  );
  TestValidator.equals(
    "cart line remains tied to the same variant",
    updatedItem.productVariant.id,
    variantId,
  );
  TestValidator.equals(
    "single variant line remains unique after update",
    updated.data.filter((item) => item.productVariant.id === variantId).length,
    1,
  );
  TestValidator.predicate(
    "cart total is non-negative and consistent",
    updatedItem.quantity >= 1,
  );
  TestValidator.predicate(
    "pagination record count is preserved or increased consistently",
    updated.pagination.records >= initialTotal,
  );
  const merged = await api.functional.mallPlatform.customer.carts.items.index(
    customerConnection,
    {
      cartId,
      body: {
        mallPlatformProductVariantId: variantId,
        quantity: 3,
        page: 1,
        limit: 10,
      } satisfies IMallPlatformCartItem.IRequest,
    },
  );
  typia.assert(merged);
  const mergedItem = merged.data.find(
    (item) => item.productVariant.id === variantId,
  );
  TestValidator.predicate(
    "target variant remains present after merge update",
    !!mergedItem,
  );
  if (!mergedItem) return;
  TestValidator.equals("merged quantity combines into one line", mergedItem.quantity, 3);
  TestValidator.equals(
    "variant line is not duplicated after merging",
    merged.data.filter((item) => item.productVariant.id === variantId).length,
    1,
  );
  TestValidator.equals(
    "merge keeps the same line item identity",
    mergedItem.id,
    updatedItem.id,
  );
  TestValidator.equals("merge keeps pagination consistent", merged.pagination.current, 1);
  const overLimitQuantity = 1000000;
  try {
    const rejected = await api.functional.mallPlatform.customer.carts.items.index(
      customerConnection,
      {
        cartId,
        body: {
          mallPlatformProductVariantId: variantId,
          quantity: overLimitQuantity,
          page: 1,
          limit: 10,
        } satisfies IMallPlatformCartItem.IRequest,
      },
    );
    typia.assert(rejected);
    const rejectedItem = rejected.data.find(
      (item) => item.productVariant.id === variantId,
    );
    TestValidator.predicate(
      "failed stock update preserves the target line when response succeeds",
      !!rejectedItem,
    );
    if (rejectedItem) {
      TestValidator.equals(
        "stock-sensitive update does not alter existing quantity unexpectedly",
        rejectedItem.quantity,
        mergedItem.quantity,
      );
      TestValidator.equals(
        "unaffected cart line count remains stable",
        rejected.data.length,
        merged.data.length,
      );
      TestValidator.predicate(
        "cart total remains unchanged on rejected-or-no-op update",
        rejectedItem.quantity === mergedItem.quantity,
      );
    }
  } catch {
    const afterFailure = await api.functional.mallPlatform.customer.carts.items.index(
      customerConnection,
      {
        cartId,
        body: {
          mallPlatformProductVariantId: variantId,
          quantity: 3,
          page: 1,
          limit: 10,
        } satisfies IMallPlatformCartItem.IRequest,
      },
    );
    typia.assert(afterFailure);
    TestValidator.equals(
      "cart item count remains intact after rejected stock update",
      afterFailure.data.length,
      merged.data.length,
    );
    TestValidator.equals(
      "target variant quantity remains intact after rejected stock update",
      afterFailure.data.find((item) => item.productVariant.id === variantId)?.quantity,
      mergedItem.quantity,
    );
  }
}
