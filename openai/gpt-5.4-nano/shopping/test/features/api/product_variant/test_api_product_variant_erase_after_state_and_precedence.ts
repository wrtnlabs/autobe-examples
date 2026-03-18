import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request";
import { generate_random_shopping_mall_member_order_items_create } from "../../../generate/generate_random_shopping_mall_member_order_items_create";
import { generate_random_shopping_mall_member_product_variant_snapshots_create } from "../../../generate/generate_random_shopping_mall_member_product_variant_snapshots_create";
import { generate_random_shopping_mall_member_product_variants_create } from "../../../generate/generate_random_shopping_mall_member_product_variants_create";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_variant_snapshot";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_product_variant_erase_after_state_and_precedence(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(seller);

  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const product1 =
    await generate_random_shopping_mall_member_products_create_product(
      sellerConnection,
      {
        body: {
          code: `p1-${RandomGenerator.alphabets(10)}`,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_featured: typia.random<boolean>(),
          shopping_mall_category_id: categoryId,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product1);

  const variant1 =
    await generate_random_shopping_mall_member_product_variants_create(
      sellerConnection,
      {
        body: {
          shopping_mall_product_id: product1.id,
          code: `v1-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          option_value: RandomGenerator.alphabets(6),
          price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);

  const snapshot1 =
    await generate_random_shopping_mall_member_product_variant_snapshots_create(
      sellerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant1.id,
          code: variant1.code,
          name: variant1.title,
          price: variant1.price,
          currency: "USD",
          is_available: variant1.is_active,
          variant_status: "active",
        } satisfies IShoppingMallProductVariantSnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);

  await api.functional.shoppingMall.member.productVariants.erase(
    sellerConnection,
    { productVariantId: variant1.id },
  );

  await TestValidator.error(
    "variant should be inaccessible after erase (scenario 1)",
    async () => {
      await api.functional.shoppingMall.member.productVariants.at(
        sellerConnection,
        { productVariantId: variant1.id },
      );
    },
  );

  const snapshotsAfter1 =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      sellerConnection,
      {
        body: {
          productVariantId: variant1.id,
          page: 1,
          limit: 10,
        },
      },
    );

  typia.assert(snapshotsAfter1);
  TestValidator.equals(
    "snapshot should still exist after erase (scenario 1)",
    snapshotsAfter1.data.length > 0,
    true,
  );

  const found1 = snapshotsAfter1.data.find((x) => x.id === snapshot1.id);
  TestValidator.predicate(
    "created snapshot should remain accessible after erase",
    () => found1 !== undefined,
  );

  const product2 =
    await generate_random_shopping_mall_member_products_create_product(
      sellerConnection,
      {
        body: {
          code: `p2-${RandomGenerator.alphabets(10)}`,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_featured: typia.random<boolean>(),
          shopping_mall_category_id: categoryId,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product2);

  const variant2 =
    await generate_random_shopping_mall_member_product_variants_create(
      sellerConnection,
      {
        body: {
          shopping_mall_product_id: product2.id,
          code: `v2-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          option_value: RandomGenerator.alphabets(6),
          price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);

  const orderItem2 =
    await generate_random_shopping_mall_member_order_items_create(
      sellerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant2.id,
          seller_price_at_purchase: variant2.price,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          shopping_mall_order_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          seller_snapshot_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          line_item_status: typia.random<string>(),
          placed_at: typia.random<string & tags.Format<"date-time">>(),
        } satisfies IShoppingMallOrderItem.ICreate,
      },
    );
  typia.assert(orderItem2);

  await generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request(
    sellerConnection,
    {
      body: {
        orderItemId: orderItem2.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IShoppingMallCancellationRequest.ICreate,
    },
  );

  await generate_random_shopping_mall_member_refund_requests_create(
    sellerConnection,
    {
      body: {
        orderItemId: orderItem2.id,
        customerReason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IShoppingMallRefundRequest.ICreate,
    },
  );

  const snapshot2 =
    await generate_random_shopping_mall_member_product_variant_snapshots_create(
      sellerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant2.id,
          code: variant2.code,
          name: variant2.title,
          price: variant2.price,
          currency: "USD",
          is_available: variant2.is_active,
          variant_status: "active",
        } satisfies IShoppingMallProductVariantSnapshot.ICreate,
      },
    );
  typia.assert(snapshot2);

  await TestValidator.error(
    "variant erase should be rejected when blockers exist (scenario 2)",
    async () => {
      await api.functional.shoppingMall.member.productVariants.erase(
        sellerConnection,
        { productVariantId: variant2.id },
      );
    },
  );

  const variant2After =
    await api.functional.shoppingMall.member.productVariants.at(
      sellerConnection,
      { productVariantId: variant2.id },
    );
  typia.assert(variant2After);

  TestValidator.equals(
    "variant should remain present after rejected erase (scenario 2)",
    variant2After.id,
    variant2.id,
  );

  const snapshotsAfter2 =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      sellerConnection,
      {
        body: {
          productVariantId: variant2.id,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotsAfter2);

  const found2 = snapshotsAfter2.data.find((x) => x.id === snapshot2.id);
  TestValidator.predicate(
    "snapshot should remain accessible after rejected erase",
    () => found2 !== undefined,
  );
}
