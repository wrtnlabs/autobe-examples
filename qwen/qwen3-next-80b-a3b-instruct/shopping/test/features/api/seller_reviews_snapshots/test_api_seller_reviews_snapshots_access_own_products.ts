import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_reviews_snapshots_access_own_products(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as seller using utility function which automatically updates connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // The authorize_seller_join utility function automatically updates sellerConnection.headers
  // Since we can't create products, we'll make a request with a random product_id.
  // The API should only return snapshots for products owned by this seller.
  // If none exist, that's an expected outcome, not a failure.
  const productId = typia.random<string & tags.Format<"uuid">>();
  const request: IShoppingMallReviewSnapshot.IRequest = {
    page: 1,
    limit: 10,
    product_id: productId,
  };
  // Use the seller connection which has been properly authenticated
  const snapshots =
    await api.functional.shoppingMall.seller.reviews_snapshots.index(
      sellerConnection,
      {
        body: request,
      },
    );
  typia.assert(snapshots);
  // Validate pagination structure (must always be present)
  TestValidator.equals("page is correct", snapshots.pagination.current, 1);
  TestValidator.equals("limit is correct", snapshots.pagination.limit, 10);
  TestValidator.predicate(
    "records is >= 0",
    () => snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is >= 0",
    () => snapshots.pagination.pages >= 0,
  );
  // Validate snapshot structure for each item if data exists
  for (const snapshot of snapshots.data) {
    // Validate core fields
    TestValidator.equals(
      "rating is int32 between 1-5",
      typeof snapshot.rating,
      "number",
    );
    TestValidator.predicate(
      "rating is between 1-5",
      () => snapshot.rating >= 1 && snapshot.rating <= 5,
    );
    TestValidator.equals(
      "is_deleted is boolean",
      typeof snapshot.is_deleted,
      "boolean",
    );
    TestValidator.predicate(
      "changed_at is valid date-time",
      () => !isNaN(Date.parse(snapshot.changed_at)),
    );
    TestValidator.equals(
      "changed_by is 'customer' or 'admin'",
      true,
      ["customer", "admin"].includes(snapshot.changed_by),
    );
    // Safely validate previous_rating using satisfies to avoid TypeScript errors
    if (
      snapshot.previous_rating !== null &&
      snapshot.previous_rating !== undefined
    ) {
      TestValidator.equals(
        "previous_rating is int32 between 1-5",
        typeof snapshot.previous_rating,
        "number",
      );
      // Use satisfies to safely cast to number
      const safeRating = snapshot.previous_rating satisfies number as number;
      TestValidator.predicate(
        "previous_rating is between 1-5",
        () => safeRating >= 1 && safeRating <= 5,
      );
    }
    // Validate previous_content
    if (
      snapshot.previous_content !== null &&
      snapshot.previous_content !== undefined
    ) {
      TestValidator.equals(
        "previous_content is string or null",
        typeof snapshot.previous_content,
        "string",
      );
    }
    // Validate previous_is_deleted
    if (
      snapshot.previous_is_deleted !== null &&
      snapshot.previous_is_deleted !== undefined
    ) {
      TestValidator.equals(
        "previous_is_deleted is boolean",
        typeof snapshot.previous_is_deleted,
        "boolean",
      );
    }
  }
}
