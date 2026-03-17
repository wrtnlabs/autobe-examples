import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_search_hidden_listing_exclusion(
  connection: api.IConnection,
): Promise<void> {
  const storefrontConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const searchKeyword: string = RandomGenerator.alphaNumeric(8);
  const minimumBasePrice = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
  >() satisfies number as number;
  const maximumBasePrice = (minimumBasePrice +
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >()) satisfies number as number;
  const page = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
  >() satisfies number as number;
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
  >() satisfies number as number;
  const request = {
    search: searchKeyword,
    minimumBasePrice,
    maximumBasePrice,
    page,
    limit,
  } satisfies IShoppingMallProduct.IRequest;
  const first = await api.functional.shoppingMall.products.index(
    storefrontConnection,
    {
      body: request,
    },
  );
  typia.assert(first);
  const second = await api.functional.shoppingMall.products.index(
    storefrontConnection,
    {
      body: request,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "repeated request current page remains stable",
    first.pagination.current,
    second.pagination.current,
  );
  TestValidator.equals(
    "repeated request page limit remains stable",
    first.pagination.limit,
    second.pagination.limit,
  );
  TestValidator.equals(
    "repeated request total record count remains stable",
    first.pagination.records,
    second.pagination.records,
  );
  TestValidator.equals(
    "repeated request total pages remain stable",
    first.pagination.pages,
    second.pagination.pages,
  );
  TestValidator.equals(
    "repeated request product ids remain stable",
    first.data.map((product) => product.id),
    second.data.map((product) => product.id),
  );
  for (const product of first.data) {
    TestValidator.equals(
      "visible product is not soft deleted in first response",
      product.deleted_at,
      null,
    );
    TestValidator.equals(
      "visible product seller is not suspended in first response",
      product.seller.suspended,
      false,
    );
    TestValidator.equals(
      "visible product seller is not soft deleted in first response",
      product.seller.deleted_at,
      null,
    );
    if (product.category !== null) {
      TestValidator.equals(
        "visible product category is not soft deleted in first response",
        product.category.deleted_at,
        null,
      );
    }
    TestValidator.predicate(
      "visible product base price satisfies minimum in first response",
      product.base_price >= minimumBasePrice,
    );
    TestValidator.predicate(
      "visible product base price satisfies maximum in first response",
      product.base_price <= maximumBasePrice,
    );
  }
  for (const product of second.data) {
    TestValidator.equals(
      "visible product is not soft deleted in second response",
      product.deleted_at,
      null,
    );
    TestValidator.equals(
      "visible product seller is not suspended in second response",
      product.seller.suspended,
      false,
    );
    TestValidator.equals(
      "visible product seller is not soft deleted in second response",
      product.seller.deleted_at,
      null,
    );
    if (product.category !== null) {
      TestValidator.equals(
        "visible product category is not soft deleted in second response",
        product.category.deleted_at,
        null,
      );
    }
    TestValidator.predicate(
      "visible product base price satisfies minimum in second response",
      product.base_price >= minimumBasePrice,
    );
    TestValidator.predicate(
      "visible product base price satisfies maximum in second response",
      product.base_price <= maximumBasePrice,
    );
  }
}
