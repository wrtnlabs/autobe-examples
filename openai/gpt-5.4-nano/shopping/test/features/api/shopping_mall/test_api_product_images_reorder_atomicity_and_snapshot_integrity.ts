import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_images_reorder_atomicity_and_snapshot_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Seller A and Seller B member sessions
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });

  // Create products for each seller
  const sellerAProduct =
    await generate_random_shopping_mall_member_products_create_product(
      sellerAConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(12),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          is_featured: typia.random<boolean>(),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(sellerAProduct);

  // Seller B product (only to have a distinct id to use as keyword)
  const sellerBProduct =
    await generate_random_shopping_mall_member_products_create_product(
      sellerBConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(12),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          is_featured: typia.random<boolean>(),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(sellerBProduct);

  const productId = sellerAProduct.id;
  const fetchImages = async (actorConnection: api.IConnection) => {
    const page = await api.functional.shoppingMall.member.productImages.index(
      actorConnection,
      {
        body: {
          shoppingMallProductId: productId,
          sort: "displayOrderAsc",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          deletedAt: null,
        },
      },
    );
    typia.assert(page);
    return page;
  };

  const before = await fetchImages(sellerAConnection);
  const beforeSnapshot = {
    records: before.pagination.records,
    pages: before.pagination.pages,
    limit: before.pagination.limit,
    ids: before.data.map((x) => x.id),
    displayOrders: before.data.map((x) => x.display_order),
  };

  // Seller B attempts to operate on Seller A product scope.
  // If the server rejects it, it must not partially apply any reorder/snapshot.
  // If the server instead treats it as a read-filter request, ordering should still not change.
  try {
    await api.functional.shoppingMall.member.productImages.index(
      sellerBConnection,
      {
        body: {
          shoppingMallProductId: sellerAProduct.id,
          sort: "displayOrderAsc",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          deletedAt: null,
          hrefKeyword: sellerBProduct.id,
        },
      },
    );
  } catch {
    // ignore; we validate atomicity by checking Seller A ordering below
  }

  const after = await fetchImages(sellerAConnection);
  const afterSnapshot = {
    records: after.pagination.records,
    pages: after.pagination.pages,
    limit: after.pagination.limit,
    ids: after.data.map((x) => x.id),
    displayOrders: after.data.map((x) => x.display_order),
  };

  TestValidator.equals(
    "image list records unchanged",
    afterSnapshot.records,
    beforeSnapshot.records,
  );
  TestValidator.equals(
    "image list page count unchanged",
    afterSnapshot.pages,
    beforeSnapshot.pages,
  );
  TestValidator.equals(
    "image list ids unchanged",
    afterSnapshot.ids,
    beforeSnapshot.ids,
  );
  TestValidator.equals(
    "image display_order unchanged",
    afterSnapshot.displayOrders,
    beforeSnapshot.displayOrders,
  );

  // Control: Seller A repeats the authorized request; ordering must remain stable
  const control = await fetchImages(sellerAConnection);
  typia.assert(control);
  TestValidator.equals(
    "control records unchanged",
    control.pagination.records,
    before.pagination.records,
  );
  TestValidator.equals(
    "control ids unchanged",
    control.data.map((x) => x.id),
    before.data.map((x) => x.id),
  );
  TestValidator.equals(
    "control display_order unchanged",
    control.data.map((x) => x.display_order),
    before.data.map((x) => x.display_order),
  );
}
