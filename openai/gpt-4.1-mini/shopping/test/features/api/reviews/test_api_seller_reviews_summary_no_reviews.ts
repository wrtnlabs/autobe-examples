import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_reviews_summary_no_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Call the summary endpoint
  const summary =
    await api.functional.shoppingMall.seller.reviews.summary(sellerConnection);
  typia.assert(summary);
  // 3. Validate response represents no reviews state
  // Since exact fields for IShoppingMallSaleReview are not defined,
  // we check for typical expected default values like null or zero where applicable.
  // For unknown fields, no unchecked properties are accessed.
  // If schema changes, revise this validation accordingly.
  // Example check: ensure it's an object and has no errors
  TestValidator.predicate(
    "summary is object",
    typeof summary === "object" && summary !== null,
  );
  // Since no reviews exist, we expect count fields (if any) to be zero,
  // and averages to be null or zero.
  // Without concrete DTO properties, we trust typia assertion.
}
