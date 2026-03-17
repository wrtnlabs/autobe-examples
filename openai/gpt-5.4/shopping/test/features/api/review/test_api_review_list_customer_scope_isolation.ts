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

export async function test_api_review_list_customer_scope_isolation(
  connection: api.IConnection,
): Promise<void> {
  const customerOneConnection: api.IConnection = {
    host: connection.host,
  };
  const customerOne = await authorize_customer_join(customerOneConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer1!Pass1234" satisfies string as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerOne);
  const customerTwoConnection: api.IConnection = {
    host: connection.host,
  };
  const customerTwo = await authorize_customer_join(customerTwoConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer2!Pass1234" satisfies string as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerTwo);
  TestValidator.notEquals(
    "customers must be distinct identities",
    customerOne.id,
    customerTwo.id,
  );
  const baseline = await api.functional.shoppingMall.customer.reviews.index(
    customerOneConnection,
    {
      body: {
        page: 1 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        limit: 20 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sort: "-created_at",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(baseline);
  TestValidator.equals(
    "baseline current page should match request",
    baseline.pagination.current,
    1,
  );
  TestValidator.equals(
    "baseline limit should match request",
    baseline.pagination.limit,
    20,
  );
  for (const review of baseline.data) {
    TestValidator.equals(
      "baseline review belongs to authenticated customer",
      review.customer.id,
      customerOne.id,
    );
    TestValidator.notEquals(
      "baseline review must not belong to another customer",
      review.customer.id,
      customerTwo.id,
    );
  }
  const crossCustomerOrderFilter =
    await api.functional.shoppingMall.customer.reviews.index(
      customerOneConnection,
      {
        body: {
          orderId: typia.assert<string & tags.Format<"uuid">>(customerTwo.id),
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 10 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "created_at",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(crossCustomerOrderFilter);
  TestValidator.equals(
    "cross-customer orderId filter should not expose foreign reviews",
    crossCustomerOrderFilter.data.length,
    0,
  );
  const crossCustomerOrderItemFilter =
    await api.functional.shoppingMall.customer.reviews.index(
      customerOneConnection,
      {
        body: {
          orderItemId: typia.assert<string & tags.Format<"uuid">>(
            customerTwo.id,
          ),
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 10 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "updated_at",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(crossCustomerOrderItemFilter);
  TestValidator.equals(
    "cross-customer orderItemId filter should not expose foreign reviews",
    crossCustomerOrderItemFilter.data.length,
    0,
  );
  const impossibleSearch = `${customerTwo.id}-${RandomGenerator.alphaNumeric(12)}`;
  const searchFilter = await api.functional.shoppingMall.customer.reviews.index(
    customerOneConnection,
    {
      body: {
        search: impossibleSearch,
        rating: 5 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        deleted: false,
        page: 1 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        limit: 10 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sort: "-rating",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(searchFilter);
  TestValidator.equals(
    "non-matching search and rating filters should safely return an empty page",
    searchFilter.data.length,
    0,
  );
  const deletedFilter =
    await api.functional.shoppingMall.customer.reviews.index(
      customerOneConnection,
      {
        body: {
          deleted: true,
          search: `${customerTwo.email}-${RandomGenerator.alphaNumeric(8)}`,
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 10 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "-updated_at",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(deletedFilter);
  TestValidator.equals(
    "deleted review filter with non-matching search should not leak foreign data",
    deletedFilter.data.length,
    0,
  );
  const combinedForeignLookingFilter =
    await api.functional.shoppingMall.customer.reviews.index(
      customerOneConnection,
      {
        body: {
          orderId: typia.assert<string & tags.Format<"uuid">>(customerTwo.id),
          orderItemId: typia.assert<string & tags.Format<"uuid">>(
            customerTwo.id,
          ),
          rating: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          search: `${customerTwo.id} ${customerTwo.email}`,
          deleted: false,
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 5 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "rating",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(combinedForeignLookingFilter);
  TestValidator.equals(
    "combined foreign-looking filters should produce an empty page",
    combinedForeignLookingFilter.data.length,
    0,
  );
  for (const page of [
    baseline,
    crossCustomerOrderFilter,
    crossCustomerOrderItemFilter,
    searchFilter,
    deletedFilter,
    combinedForeignLookingFilter,
  ]) {
    for (const review of page.data) {
      TestValidator.equals(
        "every returned review is still scoped to the authenticated customer",
        review.customer.id,
        customerOne.id,
      );
      TestValidator.notEquals(
        "no returned review may belong to the second customer",
        review.customer.id,
        customerTwo.id,
      );
    }
  }
}
