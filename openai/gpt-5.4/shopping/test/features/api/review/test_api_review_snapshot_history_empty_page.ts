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

export async function test_api_review_snapshot_history_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const review: IShoppingMallReview =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {},
    );
  typia.assert<IShoppingMallReview>(review);
  const request = {
    page: 1,
    limit: 10,
    sort: "created_at_desc",
  } satisfies IShoppingMallReviewSnapshot.IRequest;
  const firstPage: IPageIShoppingMallReviewSnapshot =
    await api.functional.shoppingMall.administrator.reviews.snapshots.index(
      administratorConnection,
      {
        reviewId: review.id,
        body: request,
      },
    );
  typia.assert<IPageIShoppingMallReviewSnapshot>(firstPage);
  TestValidator.equals("snapshot history is empty", firstPage.data.length, 0);
  TestValidator.equals(
    "requested current page is preserved",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested page limit is preserved",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "snapshot record count remains zero",
    firstPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "snapshot total pages remains zero",
    firstPage.pagination.pages,
    0,
  );
  const secondPage: IPageIShoppingMallReviewSnapshot =
    await api.functional.shoppingMall.administrator.reviews.snapshots.index(
      administratorConnection,
      {
        reviewId: review.id,
        body: request,
      },
    );
  typia.assert<IPageIShoppingMallReviewSnapshot>(secondPage);
  TestValidator.equals("repeat read remains empty", secondPage.data.length, 0);
  TestValidator.equals(
    "repeat read keeps current page",
    secondPage.pagination.current,
    firstPage.pagination.current,
  );
  TestValidator.equals(
    "repeat read keeps page limit",
    secondPage.pagination.limit,
    firstPage.pagination.limit,
  );
  TestValidator.equals(
    "repeat read keeps zero record count",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "repeat read keeps zero total pages",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.equals(
    "repeat read keeps empty data length",
    secondPage.data.length,
    firstPage.data.length,
  );
}
