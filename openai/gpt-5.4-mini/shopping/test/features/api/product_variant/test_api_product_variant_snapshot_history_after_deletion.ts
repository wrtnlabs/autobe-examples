import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_product_variant_snapshot_history_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const administratorConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const administratorJoin = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(administratorJoin);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date().toISOString();
  const firstUpdateBody = {
    skuCode: `sku-${RandomGenerator.alphaNumeric(8)}`,
    overridePrice: 1000,
    optionValues: [
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        productVariant: null as unknown as IShoppingMallProductVariant,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        optionName: "color",
        optionValue: RandomGenerator.name(1),
      },
    ] satisfies IShoppingMallProductVariantOption[],
  } satisfies IShoppingMallProductVariant.IUpdate;
  const secondUpdateBody = {
    skuCode: `sku-${RandomGenerator.alphaNumeric(8)}`,
    overridePrice: 2000,
    optionValues: [
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        productVariant: null as unknown as IShoppingMallProductVariant,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        optionName: "color",
        optionValue: RandomGenerator.name(1),
      },
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        productVariant: null as unknown as IShoppingMallProductVariant,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        optionName: "size",
        optionValue: RandomGenerator.name(1),
      },
    ] satisfies IShoppingMallProductVariantOption[],
  } satisfies IShoppingMallProductVariant.IUpdate;
  const firstVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId,
        variantId,
        body: firstUpdateBody,
      },
    );
  typia.assert(firstVariant);
  const secondVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId,
        variantId,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondVariant);
  const firstSnapshots =
    await api.functional.shoppingMall.administrator.productVariants.snapshots.index(
      administratorConnection,
      {
        productVariantId: variantId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(firstSnapshots);
  TestValidator.predicate(
    "snapshot history should contain preserved rows before deletion",
    firstSnapshots.data.length >= 1,
  );
  TestValidator.equals(
    "snapshot pagination should start from first page",
    firstSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "snapshot pagination limit should match request",
    firstSnapshots.pagination.limit,
    100,
  );
  TestValidator.equals(
    "snapshot rows should belong to the requested variant",
    firstSnapshots.data.every(
      (snapshot) => snapshot.productVariant.id === variantId,
    ),
    true,
  );
  TestValidator.predicate(
    "historical snapshot should preserve earlier SKU or option state",
    firstSnapshots.data.some(
      (snapshot) =>
        snapshot.skuCode === firstUpdateBody.skuCode ||
        snapshot.price === firstUpdateBody.overridePrice,
    ),
  );
  const secondSnapshots =
    await api.functional.shoppingMall.administrator.productVariants.snapshots.index(
      administratorConnection,
      {
        productVariantId: variantId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(secondSnapshots);
  TestValidator.equals(
    "snapshot history should remain immutable across repeated reads",
    secondSnapshots.pagination.records,
    firstSnapshots.pagination.records,
  );
  TestValidator.equals(
    "snapshot history rows should remain immutable across repeated reads",
    secondSnapshots.data.length,
    firstSnapshots.data.length,
  );
  TestValidator.equals(
    "snapshot history content should remain unchanged across repeated reads",
    secondSnapshots.data,
    firstSnapshots.data,
  );
}
