import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_stock_status_seller_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Access stock status endpoint
  const stockStatusResponse: IPageIEcommerceMallProductVariant.ISummary =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      sellerConnection,
      {
        body: {
          pageSize: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(stockStatusResponse);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    stockStatusResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    stockStatusResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    stockStatusResponse.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    stockStatusResponse.pagination.pages,
    stockStatusResponse.pagination.records > 0
      ? Math.ceil(
          stockStatusResponse.pagination.records /
            stockStatusResponse.pagination.limit,
        )
      : 0,
  );
  // 4. Validate response structure
  TestValidator.predicate(
    "response has data array",
    Array.isArray(stockStatusResponse.data),
  );
  // 5. Validate each variant structure (if any exist)
  await ArrayUtil.asyncForEach(stockStatusResponse.data, async (variant) => {
    typia.assert(variant);
    // Validate required fields
    typia.assert(variant.product);
    typia.assert(variant.product.seller);
    typia.assert(variant.product.category);
    // Validate variant structure
    TestValidator.equals(
      "variant has skuCode",
      typeof variant.skuCode,
      "string",
    );
    TestValidator.predicate(
      "skuCode length valid",
      variant.skuCode.length <= 50,
    );
    TestValidator.equals(
      "variant has stockQuantity",
      typeof variant.stockQuantity,
      "number",
    );
    TestValidator.predicate(
      "stockQuantity is non-negative",
      variant.stockQuantity >= 0,
    );
    TestValidator.equals(
      "variant has isActive",
      typeof variant.isActive,
      "boolean",
    );
    TestValidator.equals(
      "variant has displayPrice",
      typeof variant.displayPrice,
      "number",
    );
    TestValidator.predicate(
      "displayPrice is non-negative",
      variant.displayPrice >= 0,
    );
    // Validate product reference
    TestValidator.equals(
      "product has name",
      typeof variant.product.name,
      "string",
    );
    TestValidator.equals(
      "product has base_price",
      typeof variant.product.base_price,
      "number",
    );
    TestValidator.equals(
      "product has is_active",
      typeof variant.product.is_active,
      "boolean",
    );
    TestValidator.equals(
      "product has seller",
      typeof variant.product.seller,
      "object",
    );
    TestValidator.equals(
      "product has category",
      typeof variant.product.category,
      "object",
    );
    // Validate displayPrice calculation
    const expectedPrice =
      variant.priceOverride !== undefined && variant.priceOverride !== null
        ? variant.priceOverride
        : variant.product.base_price;
    TestValidator.equals(
      "displayPrice calculation correct",
      variant.displayPrice,
      expectedPrice,
    );
    // Validate timestamp formats
    TestValidator.predicate(
      "product created_at is valid date-time",
      !isNaN(Date.parse(variant.product.created_at)),
    );
    TestValidator.predicate(
      "seller created_at is valid date-time",
      !isNaN(Date.parse(seller.created_at)),
    );
  });
}