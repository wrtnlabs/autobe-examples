import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller product browse listing response structure and pagination behavior.
 *
 * Verifies that a signed-in seller can request the marketplace product browse endpoint and receive a paginated page of product summaries. The test focuses on the browse-card projection, including pagination metadata, seller and category summaries, thumbnail image data, pricing aggregates, availability counters, review aggregates, and timestamps.
 *
 * It also checks that the endpoint honors the requested sort mode and returns list data in a stable order when multiple items are present. Only the fields defined by the browse-summary DTOs are validated.
 *
 * 1. Register and authenticate a seller session using the seller join utility.
 * 2. Request the seller product browse endpoint with standard pagination and browse criteria.
 * 3. Validate the paginated response structure and browse-summary fields.
 * 4. Confirm the returned list is consistently ordered for the requested sort mode.
 */
export async function test_api_product_browse_list(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: "1234" satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const request = {
    page: 1,
    limit: 10,
    sort: "newest",
    search: RandomGenerator.alphabets(3),
  } satisfies IMallPlatformProduct.IRequest;
  const output = await api.functional.mallPlatform.seller.products.index(
    sellerConnection,
    { body: request },
  );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page",
    output.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "pagination page size",
    output.pagination.limit,
    request.limit ?? 0,
  );
  TestValidator.predicate(
    "pagination totals are non-negative",
    output.pagination.records >= 0 && output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "result data is an array",
    Array.isArray(output.data),
  );
  if (output.data.length > 0) {
    for (const item of output.data) {
      typia.assert(item);
      TestValidator.predicate(
        "summary has identity and timestamps",
        item.id.length > 0 &&
          item.name.length > 0 &&
          item.createdAt.length > 0 &&
          item.updatedAt.length > 0,
      );
      TestValidator.predicate(
        "pricing summary is coherent",
        item.basePrice >= 0 &&
          item.priceMin >= 0 &&
          item.priceMax >= item.priceMin,
      );
      TestValidator.predicate(
        "aggregate counters are non-negative",
        item.availableVariantCount >= 0 && item.reviewCount >= 0,
      );
      TestValidator.predicate(
        "seller summary is present",
        item.sellerAccount.id.length > 0 &&
          item.sellerAccount.email.length > 0 &&
          item.sellerAccount.status.length > 0,
      );
      TestValidator.predicate(
        "category summary is nullable summary",
        item.category === null ||
          (item.category.id.length > 0 && item.category.name.length > 0),
      );
      TestValidator.predicate(
        "image summary is nullable summary",
        item.mainImage === null ||
          (item.mainImage.id.length > 0 && item.mainImage.imageUrl.length > 0),
      );
      TestValidator.predicate(
        "average rating is nullable numeric",
        item.averageRating === null || item.averageRating >= 0,
      );
    }
    if (request.sort === "newest") {
      for (let i = 1; i < output.data.length; ++i) {
        TestValidator.predicate(
          "newest sort is stable by createdAt descending",
          output.data[i - 1].createdAt >= output.data[i].createdAt,
        );
      }
    }
  }
}
