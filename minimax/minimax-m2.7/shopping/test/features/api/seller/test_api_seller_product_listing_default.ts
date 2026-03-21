import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_listing_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Call product listing endpoint with default parameters (empty body = no filters, newest sort)
  const response = await api.functional.ecommerceMall.seller.products.index(
    sellerConnection,
    {
      body: {} satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response structure - check pagination metadata exists
  TestValidator.equals(
    "has pagination metadata",
    response.pagination !== null && response.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has current page",
    typeof response.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    typeof response.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    typeof response.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination has pages count",
    typeof response.pagination.pages === "number",
    true,
  );
  TestValidator.predicate(
    "pagination values non-negative",
    response.pagination.current >= 0 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.equals("has data array", Array.isArray(response.data), true);
  // 5. Validate each product in the list has required fields
  for (const product of response.data) {
    typia.assert(product);
    TestValidator.equals(
      "has id",
      typeof product.id === "string" && product.id.length > 0,
      true,
    );
    TestValidator.equals("has name", typeof product.name === "string", true);
    TestValidator.equals(
      "has min_price",
      typeof product.min_price === "number",
      true,
    );
    TestValidator.equals(
      "has max_price",
      typeof product.max_price === "number",
      true,
    );
    TestValidator.equals(
      "has primary_image_url",
      typeof product.primary_image_url === "string",
      true,
    );
    TestValidator.equals(
      "has seller_name",
      typeof product.seller_name === "string",
      true,
    );
    TestValidator.equals(
      "has average_rating",
      typeof product.average_rating === "number",
      true,
    );
    TestValidator.equals(
      "has reviews_count",
      typeof product.reviews_count === "number",
      true,
    );
    TestValidator.equals(
      "has created_at",
      typeof product.created_at === "string",
      true,
    );
    // 6. Validate price consistency
    TestValidator.predicate(
      "min_price <= max_price",
      product.min_price <= product.max_price,
    );
  }
  // 7. Validate sorting - products should be sorted by created_at DESC (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at).getTime();
      const next = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `product at index ${i} is newer than product at index ${i + 1}`,
        current >= next,
      );
    }
  }
}
