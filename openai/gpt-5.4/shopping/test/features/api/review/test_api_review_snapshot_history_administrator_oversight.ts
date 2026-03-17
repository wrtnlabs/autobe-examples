import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_review_snapshot_history_administrator_oversight(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review);
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorAuth = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(administratorAuth);
  const page = 1 satisfies number as number;
  const limit = 100 satisfies number as number;
  const request = {
    page,
    limit,
  } satisfies IShoppingMallReviewSnapshot.IRequest;
  const firstPage: IPageIShoppingMallReviewSnapshot =
    await api.functional.shoppingMall.administrator.reviews.snapshots.index(
      administratorConnection,
      {
        reviewId: review.id,
        body: request,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "snapshot history pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "snapshot history pagination limit covers returned data",
    firstPage.pagination.limit >= firstPage.data.length,
  );
  TestValidator.predicate(
    "snapshot history pagination records covers returned data",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "snapshot history pagination pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  for (const snapshot of firstPage.data) {
    TestValidator.equals(
      "snapshot belongs to requested review",
      snapshot.review.id,
      review.id,
    );
    TestValidator.predicate(
      "snapshot exposes event metadata",
      snapshot.change_type.length > 0 && snapshot.id.length > 0,
    );
  }
  if (firstPage.data.length > 1) {
    for (let i = 1; i < firstPage.data.length; ++i) {
      const previous = firstPage.data[i - 1];
      const current = firstPage.data[i];
      const previousTime = new Date(previous.created_at).getTime();
      const currentTime = new Date(current.created_at).getTime();
      TestValidator.predicate(
        "snapshot history default order is reverse chronological with stable tie-break behavior when multiple items exist",
        previousTime > currentTime ||
          (previousTime === currentTime && previous.id >= current.id),
      );
    }
  }
  const secondPage: IPageIShoppingMallReviewSnapshot =
    await api.functional.shoppingMall.administrator.reviews.snapshots.index(
      administratorConnection,
      {
        reviewId: review.id,
        body: request,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "snapshot history retrieval is read only",
    secondPage,
    firstPage,
  );
}
