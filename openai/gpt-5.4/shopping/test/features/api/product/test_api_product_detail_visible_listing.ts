import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_detail_visible_listing(
  connection: api.IConnection,
): Promise<void> {
  const visitorConnection: api.IConnection = {
    host: connection.host,
  };
  const productId = typia.random<string & tags.Format<"uuid">>();
  try {
    const first = await api.functional.shoppingMall.products.at(
      visitorConnection,
      {
        productId,
      },
    );
    typia.assert(first);
    TestValidator.equals("product id matches request", first.id, productId);
    TestValidator.equals(
      "successful retrieval keeps product active child images only",
      first.images.every((image) => image.deleted_at === null),
      true,
    );
    TestValidator.equals(
      "successful retrieval keeps product active child variants only",
      first.variants.every((variant) => variant.deleted_at === null),
      true,
    );
    TestValidator.equals(
      "all images belong to requested product",
      first.images.every((image) => image.product.id === first.id),
      true,
    );
    TestValidator.equals(
      "all variants belong to requested product",
      first.variants.every((variant) => variant.product.id === first.id),
      true,
    );
    for (let i = 1; i < first.images.length; ++i) {
      TestValidator.predicate(
        `image sequence ascending at index ${i}`,
        first.images[i - 1]!.sequence <= first.images[i]!.sequence,
      );
    }
    first.images.forEach((image, i) => {
      typia.assert<IShoppingMallProductImage>(image);
      typia.assert<IShoppingMallProduct.ISummary>(image.product);
      TestValidator.equals(
        `image parent product matches detail product at index ${i}`,
        image.product.id,
        first.id,
      );
    });
    first.variants.forEach((variant, i) => {
      typia.assert<IShoppingMallProductVariant>(variant);
      typia.assert<IShoppingMallProduct.ISummary>(variant.product);
      TestValidator.equals(
        `variant parent product matches detail product at index ${i}`,
        variant.product.id,
        first.id,
      );
    });
    typia.assert<IShoppingMallSeller.ISummary>(first.seller);
    if (first.category !== null) {
      typia.assert<IShoppingMallCategory.ISummary>(first.category);
    }
    const second = await api.functional.shoppingMall.products.at(
      visitorConnection,
      {
        productId,
      },
    );
    typia.assert(second);
    TestValidator.equals(
      "repeat retrieval keeps same product id",
      second.id,
      first.id,
    );
    TestValidator.equals(
      "repeat retrieval keeps same name",
      second.name,
      first.name,
    );
    TestValidator.equals(
      "repeat retrieval keeps same description",
      second.description,
      first.description,
    );
    TestValidator.equals(
      "repeat retrieval keeps same base price",
      second.base_price,
      first.base_price,
    );
    TestValidator.equals(
      "repeat retrieval keeps same status",
      second.status,
      first.status,
    );
    TestValidator.equals(
      "repeat retrieval keeps same seller",
      second.seller,
      first.seller,
    );
    TestValidator.equals(
      "repeat retrieval keeps same category",
      second.category,
      first.category,
    );
  } catch (exp) {
    TestValidator.predicate(
      "unavailable or invisible product retrieval throws HttpError",
      exp instanceof api.HttpError,
    );
  }
}
