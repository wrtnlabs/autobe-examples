import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_list_deleted_state_filters(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  const now: Date = new Date();
  const createdFrom: string = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const createdTo: string = new Date(
    now.getTime() + 1000 * 60 * 60,
  ).toISOString();
  const updatedFrom: string = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const updatedTo: string = new Date(
    now.getTime() + 1000 * 60 * 60,
  ).toISOString();
  const search: string = RandomGenerator.paragraph({ sentences: 2 });
  const baselineRequest = {
    page: 1,
    limit: 10,
    sort: "-created_at",
  } satisfies IShoppingMallReview.IRequest;
  const activeRequest = {
    deleted: false,
    rating: 5,
    orderId: typia.random<string & tags.Format<"uuid">>(),
    orderItemId: typia.random<string & tags.Format<"uuid">>(),
    search,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    sort: "-updated_at",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallReview.IRequest;
  const deletedRequest = {
    deleted: true,
    rating: 5,
    orderId: typia.random<string & tags.Format<"uuid">>(),
    orderItemId: typia.random<string & tags.Format<"uuid">>(),
    search,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    sort: "created_at",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallReview.IRequest;
  const baseline = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: baselineRequest,
    },
  );
  typia.assert(baseline);
  const activeOnly = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: activeRequest,
    },
  );
  typia.assert(activeOnly);
  const deletedOnly = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: deletedRequest,
    },
  );
  typia.assert(deletedOnly);
  TestValidator.equals(
    "baseline page number",
    baseline.pagination.current,
    baselineRequest.page,
  );
  TestValidator.equals(
    "baseline page limit",
    baseline.pagination.limit,
    baselineRequest.limit,
  );
  TestValidator.equals(
    "active page number",
    activeOnly.pagination.current,
    activeRequest.page,
  );
  TestValidator.equals(
    "active page limit",
    activeOnly.pagination.limit,
    activeRequest.limit,
  );
  TestValidator.equals(
    "deleted page number",
    deletedOnly.pagination.current,
    deletedRequest.page,
  );
  TestValidator.equals(
    "deleted page limit",
    deletedOnly.pagination.limit,
    deletedRequest.limit,
  );
  for (const review of baseline.data) {
    TestValidator.equals(
      "baseline review belongs to customer",
      review.customer.id,
      customer.id,
    );
  }
  for (const review of activeOnly.data) {
    TestValidator.equals(
      "active review belongs to customer",
      review.customer.id,
      customer.id,
    );
    TestValidator.equals(
      "active query excludes deleted reviews",
      review.deleted_at,
      null,
    );
    TestValidator.equals(
      "active query rating matches filter",
      review.rating,
      activeRequest.rating,
    );
    TestValidator.predicate(
      "active query search remains null-safe",
      review.content === null || review.content.includes(search),
    );
  }
  for (const review of deletedOnly.data) {
    TestValidator.equals(
      "deleted review belongs to customer",
      review.customer.id,
      customer.id,
    );
    TestValidator.predicate(
      "deleted query returns soft-deleted reviews only",
      review.deleted_at !== null,
    );
    TestValidator.equals(
      "deleted query rating matches filter",
      review.rating,
      deletedRequest.rating,
    );
    TestValidator.predicate(
      "deleted query search remains null-safe",
      review.content === null || review.content.includes(search),
    );
  }
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "anonymous customer review list is rejected",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.customer.reviews.index(
        anonymousConnection,
        {
          body: {
            deleted: false,
            page: 1,
            limit: 10,
          } satisfies IShoppingMallReview.IRequest,
        },
      );
    },
  );
}
