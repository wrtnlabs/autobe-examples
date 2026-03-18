import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reviews_filter_by_product_and_order_item_oldest_newest(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: joinBody });
  // Pick existing product/order-item IDs from any available review.
  const broad: IPageIShoppingMallReview.ISummary = typia.assert(
    await api.functional.shoppingMall.admin.reviews.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
        includeDeleted: true,
        sort: "oldest",
      } satisfies IShoppingMallReview.IRequest,
    }),
  );
  TestValidator.predicate(
    "should have at least one review to derive filters",
    () => broad.data.length > 0,
  );
  const picked = broad.data[0]!;
  const shoppingMallProductId = picked.shoppingMallProductId;
  const shoppingMallOrderItemId = picked.shoppingMallOrderItemId;
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const oldestOutput: IPageIShoppingMallReview.ISummary = typia.assert(
    await api.functional.shoppingMall.admin.reviews.index(adminConnection, {
      body: {
        page,
        limit,
        shoppingMallProductId,
        shoppingMallOrderItemId,
        includeDeleted: true,
        sort: "oldest",
      } satisfies IShoppingMallReview.IRequest,
    }),
  );
  const newestOutput: IPageIShoppingMallReview.ISummary = typia.assert(
    await api.functional.shoppingMall.admin.reviews.index(adminConnection, {
      body: {
        page,
        limit,
        shoppingMallProductId,
        shoppingMallOrderItemId,
        includeDeleted: true,
        sort: "newest",
      } satisfies IShoppingMallReview.IRequest,
    }),
  );
  // Validate filtering & sort direction semantics.
  for (let i = 0; i < oldestOutput.data.length; i++) {
    const review = oldestOutput.data[i]!;
    TestValidator.equals(
      "oldestOutput product filter",
      review.shoppingMallProductId,
      shoppingMallProductId,
    );
    TestValidator.equals(
      "oldestOutput order-item filter",
      review.shoppingMallOrderItemId,
      shoppingMallOrderItemId,
    );
    if (i + 1 < oldestOutput.data.length) {
      const next = oldestOutput.data[i + 1]!;
      const aUpdated = new Date(review.updatedAt).getTime();
      const bUpdated = new Date(next.updatedAt).getTime();
      TestValidator.predicate(
        "oldestOutput updatedAt non-decreasing",
        () => aUpdated <= bUpdated,
      );
      if (aUpdated === bUpdated) {
        const aCreated = new Date(review.createdAt).getTime();
        const bCreated = new Date(next.createdAt).getTime();
        TestValidator.predicate(
          "oldestOutput createdAt non-decreasing when updatedAt ties",
          () => aCreated <= bCreated,
        );
      }
    }
  }
  for (const review of newestOutput.data) {
    TestValidator.equals(
      "newestOutput product filter",
      review.shoppingMallProductId,
      shoppingMallProductId,
    );
    TestValidator.equals(
      "newestOutput order-item filter",
      review.shoppingMallOrderItemId,
      shoppingMallOrderItemId,
    );
  }
  // Validate pagination metadata for oldest call.
  TestValidator.predicate(
    "pagination records >= returned data length",
    () => oldestOutput.pagination.records >= oldestOutput.data.length,
  );
  const { records, limit: pLimit } = oldestOutput.pagination;
  const expectedPages =
    records === 0 || pLimit === 0 ? 0 : Math.ceil(records / pLimit);
  TestValidator.equals(
    "pagination pages computed",
    oldestOutput.pagination.pages,
    expectedPages,
  );
  // Validate ID set equality and reversal (within page) using id order.
  const oldestIds = oldestOutput.data.map((x) => x.id);
  const newestIds = newestOutput.data.map((x) => x.id);
  TestValidator.equals(
    "same record id set between oldest and newest (within page)",
    [...oldestIds].sort(),
    [...newestIds].sort(),
  );
  if (oldestIds.length === newestIds.length && oldestIds.length > 0) {
    // newest is expected to be the reverse order of oldest using the same ordering keys.
    const oldestReconstructed = [...newestOutput.data]
      .reverse()
      .map((x) => x.id);
    TestValidator.equals(
      "ordering reverses between newest and oldest within page",
      oldestIds,
      oldestReconstructed,
    );
  }
}
