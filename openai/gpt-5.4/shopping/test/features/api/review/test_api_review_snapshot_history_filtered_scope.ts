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

export async function test_api_review_snapshot_history_filtered_scope(
  connection: api.IConnection,
): Promise<void> {
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  typia.assert(customerAuth);
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review);
  const secondCustomerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomerAuth = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: secondCustomerJoinBody,
    },
  );
  typia.assert(secondCustomerAuth);
  const secondReview =
    await generate_random_shopping_mall_customer_reviews_create(
      secondCustomerConnection,
      {},
    );
  typia.assert(secondReview);
  const administratorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdministrator.IJoin;
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorAuth = await authorize_administrator_join(
    administratorConnection,
    {
      body: administratorJoinBody,
    },
  );
  typia.assert(administratorAuth);
  const emptyPage =
    await api.functional.shoppingMall.administrator.reviews.snapshots.index(
      administratorConnection,
      {
        reviewId: review.id,
        body: {} satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.predicate(
    "empty request data length within records",
    emptyPage.data.length <= emptyPage.pagination.records,
  );
  for (const snapshot of emptyPage.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "empty request stays scoped to review path",
      snapshot.review.id,
      review.id,
    );
  }
  const descRequest = {
    sort: "created_at_desc",
  } satisfies IShoppingMallReviewSnapshot.IRequest;
  const descPage =
    await api.functional.shoppingMall.administrator.reviews.snapshots.index(
      administratorConnection,
      {
        reviewId: review.id,
        body: descRequest,
      },
    );
  typia.assert(descPage);
  for (let i = 0; i < descPage.data.length; i += 1) {
    const snapshot = descPage.data[i];
    typia.assert(snapshot);
    TestValidator.equals(
      "desc request stays scoped to review path",
      snapshot.review.id,
      review.id,
    );
    if (i !== 0) {
      TestValidator.predicate(
        "desc sort created_at order",
        new Date(descPage.data[i - 1].created_at).getTime() >=
          new Date(snapshot.created_at).getTime(),
      );
    }
  }
  const ascRequest = {
    sort: "created_at_asc",
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallReviewSnapshot.IRequest;
  const ascPage =
    await api.functional.shoppingMall.administrator.reviews.snapshots.index(
      administratorConnection,
      {
        reviewId: review.id,
        body: ascRequest,
      },
    );
  typia.assert(ascPage);
  TestValidator.predicate(
    "pagination current is non-negative",
    ascPage.pagination.current >= 0,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    ascPage.pagination.limit,
    ascRequest.limit,
  );
  TestValidator.predicate(
    "returned slice does not exceed limit",
    ascPage.data.length <= ascPage.pagination.limit,
  );
  TestValidator.equals(
    "pages formula is consistent",
    ascPage.pagination.pages,
    ascPage.pagination.limit === 0
      ? 0
      : Math.ceil(ascPage.pagination.records / ascPage.pagination.limit),
  );
  for (let i = 0; i < ascPage.data.length; i += 1) {
    const snapshot = ascPage.data[i];
    typia.assert(snapshot);
    TestValidator.equals(
      "asc request stays scoped to review path",
      snapshot.review.id,
      review.id,
    );
    if (i !== 0) {
      TestValidator.predicate(
        "asc sort created_at order",
        new Date(ascPage.data[i - 1].created_at).getTime() <=
          new Date(snapshot.created_at).getTime(),
      );
    }
  }
  const createdAtFrom = new Date(
    new Date(review.created_at).getTime() - 60000,
  ).toISOString();
  const createdAtTo = new Date(new Date().getTime() + 60000).toISOString();
  const baselineFilteredPage =
    await api.functional.shoppingMall.administrator.reviews.snapshots.index(
      administratorConnection,
      {
        reviewId: review.id,
        body: {
          createdAtFrom,
          createdAtTo,
          sort: "created_at_desc",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(baselineFilteredPage);
  for (const snapshot of baselineFilteredPage.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "baseline filtered page stays scoped to review path",
      snapshot.review.id,
      review.id,
    );
    TestValidator.predicate(
      "baseline filtered created_at respects lower bound",
      new Date(snapshot.created_at).getTime() >=
        new Date(createdAtFrom).getTime(),
    );
    TestValidator.predicate(
      "baseline filtered created_at respects upper bound",
      new Date(snapshot.created_at).getTime() <=
        new Date(createdAtTo).getTime(),
    );
  }
  if (baselineFilteredPage.data.length !== 0) {
    const seedSnapshot = baselineFilteredPage.data[0];
    const filteredRequest = {
      changeType: seedSnapshot.change_type,
      search:
        seedSnapshot.change_reason !== null &&
        seedSnapshot.change_reason.length !== 0
          ? seedSnapshot.change_reason
          : undefined,
      createdAtFrom,
      createdAtTo,
      sort: "created_at_desc",
      page: 1,
      limit: 100,
    } satisfies IShoppingMallReviewSnapshot.IRequest;
    const filteredPage =
      await api.functional.shoppingMall.administrator.reviews.snapshots.index(
        administratorConnection,
        {
          reviewId: review.id,
          body: filteredRequest,
        },
      );
    typia.assert(filteredPage);
    for (let i = 0; i < filteredPage.data.length; i += 1) {
      const snapshot = filteredPage.data[i];
      typia.assert(snapshot);
      TestValidator.equals(
        "filtered request stays scoped to review path",
        snapshot.review.id,
        review.id,
      );
      TestValidator.equals(
        "filtered change type matches",
        snapshot.change_type,
        filteredRequest.changeType,
      );
      TestValidator.predicate(
        "filtered created_at respects lower bound",
        new Date(snapshot.created_at).getTime() >=
          new Date(filteredRequest.createdAtFrom).getTime(),
      );
      TestValidator.predicate(
        "filtered created_at respects upper bound",
        new Date(snapshot.created_at).getTime() <=
          new Date(filteredRequest.createdAtTo).getTime(),
      );
      if (filteredRequest.search !== undefined) {
        TestValidator.predicate(
          "filtered search text matches reason",
          snapshot.change_reason !== null &&
            snapshot.change_reason.includes(filteredRequest.search),
        );
      }
      if (i !== 0) {
        TestValidator.predicate(
          "filtered desc order holds",
          new Date(filteredPage.data[i - 1].created_at).getTime() >=
            new Date(snapshot.created_at).getTime(),
        );
      }
    }
  }
  const secondReviewPage =
    await api.functional.shoppingMall.administrator.reviews.snapshots.index(
      administratorConnection,
      {
        reviewId: secondReview.id,
        body: {
          sort: "created_at_desc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(secondReviewPage);
  for (const snapshot of secondReviewPage.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "second review page stays scoped to second review path",
      snapshot.review.id,
      secondReview.id,
    );
    TestValidator.notEquals(
      "second review page does not leak first review history",
      snapshot.review.id,
      review.id,
    );
  }
}
