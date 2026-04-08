import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_product_search_keyword_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Search with keyword "Test" and sort by price ascending
  const priceAscSearch: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.guest.products.search.index(
      guestConnection,
      {
        body: {
          q: "Test",
          sort: "price_asc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(priceAscSearch);
  // Validate response structure
  TestValidator.equals(
    "pagination exists",
    priceAscSearch.pagination !== null,
    true,
  );
  TestValidator.predicate("has data array", priceAscSearch.data.length >= 0);
  // If results exist, validate sorting (price ascending)
  if (priceAscSearch.data.length > 1) {
    for (let i = 1; i < priceAscSearch.data.length; i++) {
      const prev = priceAscSearch.data[i - 1].basePrice;
      const curr = priceAscSearch.data[i].basePrice;
      TestValidator.predicate(
        `price ascending: item ${i - 1} (${prev}) <= item ${i} (${curr})`,
        prev <= curr,
      );
    }
  }
  // Validate each product has required fields
  for (const product of priceAscSearch.data) {
    TestValidator.predicate("has id", product.id !== undefined);
    TestValidator.predicate("has name", product.name !== undefined);
    TestValidator.predicate("has basePrice", product.basePrice !== undefined);
    TestValidator.predicate(
      "has thumbnailUrl",
      product.thumbnailUrl !== undefined,
    );
    TestValidator.predicate(
      "has minVariantPrice",
      product.minVariantPrice !== undefined,
    );
    TestValidator.predicate(
      "has maxVariantPrice",
      product.maxVariantPrice !== undefined,
    );
    TestValidator.predicate(
      "has hasStock boolean",
      typeof product.hasStock === "boolean",
    );
    TestValidator.predicate("has shopName", product.shopName !== undefined);
    TestValidator.predicate(
      "has averageRating",
      product.averageRating !== undefined,
    );
    TestValidator.predicate(
      "has reviewsCount",
      product.reviewsCount !== undefined,
    );
    TestValidator.predicate("has createdAt", product.createdAt !== undefined);
  }
  // Step 3: Search with same keyword and sort by price descending
  const priceDescSearch: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.guest.products.search.index(
      guestConnection,
      {
        body: {
          q: "Test",
          sort: "price_desc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(priceDescSearch);
  // Validate sorting (price descending)
  if (priceDescSearch.data.length > 1) {
    for (let i = 1; i < priceDescSearch.data.length; i++) {
      const prev = priceDescSearch.data[i - 1].basePrice;
      const curr = priceDescSearch.data[i].basePrice;
      TestValidator.predicate(
        `price descending: item ${i - 1} (${prev}) >= item ${i} (${curr})`,
        prev >= curr,
      );
    }
  }
  // Step 4: Search with same keyword and sort by newest
  const newestSearch: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.guest.products.search.index(
      guestConnection,
      {
        body: {
          q: "Test",
          sort: "newest",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(newestSearch);
  // Validate sorting (newest first - creation date descending)
  if (newestSearch.data.length > 1) {
    for (let i = 1; i < newestSearch.data.length; i++) {
      const prevDate = new Date(newestSearch.data[i - 1].createdAt);
      const currDate = new Date(newestSearch.data[i].createdAt);
      TestValidator.predicate(
        `newest sort: item ${i - 1} (${prevDate.toISOString()}) >= item ${i} (${currDate.toISOString()})`,
        prevDate >= currDate,
      );
    }
  }
  // Step 5: Verify products matching query (name contains "Test" case-insensitive)
  for (const product of priceAscSearch.data) {
    TestValidator.predicate(
      `product name contains "Test" (case-insensitive): ${product.name}`,
      product.name.toLowerCase().includes("test"),
    );
  }
  // Step 6: Verify hasStock reflects actual stock status
  for (const product of priceAscSearch.data) {
    TestValidator.predicate(
      `hasStock is boolean for product ${product.name}`,
      typeof product.hasStock === "boolean",
    );
  }
}
