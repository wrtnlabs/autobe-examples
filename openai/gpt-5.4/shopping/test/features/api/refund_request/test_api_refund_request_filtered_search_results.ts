import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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

export async function test_api_refund_request_filtered_search_results(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssword1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  const baselineRequest = {
    sort: "+created_at",
    page: 1,
    limit: 100,
  } satisfies IShoppingMallRefundRequest.IRequest;
  const baselinePage =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: baselineRequest,
      },
    );
  typia.assert(baselinePage);
  TestValidator.equals(
    "baseline pagination current page",
    baselinePage.pagination.current,
    baselineRequest.page,
  );
  TestValidator.equals(
    "baseline pagination limit",
    baselinePage.pagination.limit,
    baselineRequest.limit,
  );
  TestValidator.predicate(
    "baseline records are non-negative",
    baselinePage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "baseline pages are non-negative",
    baselinePage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "baseline page size does not exceed limit",
    baselinePage.data.length <= baselinePage.pagination.limit,
  );
  TestValidator.predicate(
    "baseline empty pages report zero total pages",
    baselinePage.pagination.records !== 0 ||
      baselinePage.pagination.pages === 0,
  );
  TestValidator.predicate(
    "baseline non-empty pages report positive total pages",
    baselinePage.pagination.records === 0 || baselinePage.pagination.pages >= 1,
  );
  for (let i = 1; i < baselinePage.data.length; ++i) {
    TestValidator.predicate(
      "baseline results are sorted by created_at ascending",
      baselinePage.data[i - 1].created_at <= baselinePage.data[i].created_at,
    );
  }
  for (const refund of baselinePage.data) {
    TestValidator.equals(
      "baseline rows belong to authenticated customer",
      refund.customer.id,
      customer.id,
    );
    TestValidator.equals(
      "baseline rows are active refund workflow records",
      refund.deleted_at,
      null,
    );
  }
  if (baselinePage.data.length === 0) {
    const emptyFilteredRequest = {
      search: RandomGenerator.alphaNumeric(12),
      sort: "+created_at",
      page: 1,
      limit: 10,
    } satisfies IShoppingMallRefundRequest.IRequest;
    const emptyFilteredPage =
      await api.functional.shoppingMall.customer.refund_requests.index(
        customerConnection,
        {
          body: emptyFilteredRequest,
        },
      );
    typia.assert(emptyFilteredPage);
    TestValidator.equals(
      "empty filtered pagination current page",
      emptyFilteredPage.pagination.current,
      emptyFilteredRequest.page,
    );
    TestValidator.equals(
      "empty filtered pagination limit",
      emptyFilteredPage.pagination.limit,
      emptyFilteredRequest.limit,
    );
    TestValidator.predicate(
      "empty filtered page size does not exceed limit",
      emptyFilteredPage.data.length <= emptyFilteredPage.pagination.limit,
    );
    TestValidator.predicate(
      "empty filtered empty pages report zero total pages",
      emptyFilteredPage.pagination.records !== 0 ||
        emptyFilteredPage.pagination.pages === 0,
    );
    TestValidator.predicate(
      "empty filtered non-empty pages report positive total pages",
      emptyFilteredPage.pagination.records === 0 ||
        emptyFilteredPage.pagination.pages >= 1,
    );
    for (const refund of emptyFilteredPage.data) {
      TestValidator.equals(
        "empty filtered rows remain customer-scoped",
        refund.customer.id,
        customer.id,
      );
      TestValidator.predicate(
        "empty filtered search still matches reason, review note, or order code",
        refund.reason.includes(emptyFilteredRequest.search) ||
          (refund.review_note !== null &&
            refund.review_note.includes(emptyFilteredRequest.search)) ||
          (refund.orderItem.shipment !== null &&
            refund.orderItem.shipment.order.code.includes(
              emptyFilteredRequest.search,
            )),
      );
    }
    return;
  }
  const sample = baselinePage.data[0];
  const deliveredAt = sample.orderItem.delivered_at;
  const orderCode = sample.orderItem.shipment?.order.code;
  const searchSource = sample.review_note ?? orderCode ?? sample.reason;
  const trimmedSearch = searchSource.slice(0, Math.min(searchSource.length, 8));
  const searchTerm =
    trimmedSearch.length !== 0 ? trimmedSearch : RandomGenerator.alphabets(6);
  const filteredRequest = {
    search: searchTerm,
    status: sample.status,
    reviewerRole: sample.reviewer_role ?? undefined,
    orderCode: orderCode ?? undefined,
    deliveredAtFrom: deliveredAt ?? undefined,
    deliveredAtTo: deliveredAt ?? undefined,
    sort: "+created_at",
    page: 1,
    limit: 100,
  } satisfies IShoppingMallRefundRequest.IRequest;
  const filteredPage =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: filteredRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.equals(
    "filtered pagination current page",
    filteredPage.pagination.current,
    filteredRequest.page,
  );
  TestValidator.equals(
    "filtered pagination limit",
    filteredPage.pagination.limit,
    filteredRequest.limit,
  );
  TestValidator.predicate(
    "filtered page size does not exceed limit",
    filteredPage.data.length <= filteredPage.pagination.limit,
  );
  TestValidator.predicate(
    "filtered records cover current page length",
    filteredPage.pagination.records >= filteredPage.data.length,
  );
  TestValidator.predicate(
    "filtered empty pages report zero total pages",
    filteredPage.pagination.records !== 0 ||
      filteredPage.pagination.pages === 0,
  );
  TestValidator.predicate(
    "filtered non-empty pages report positive total pages",
    filteredPage.pagination.records === 0 || filteredPage.pagination.pages >= 1,
  );
  for (let i = 1; i < filteredPage.data.length; ++i) {
    TestValidator.predicate(
      "filtered results are sorted by created_at ascending",
      filteredPage.data[i - 1].created_at <= filteredPage.data[i].created_at,
    );
  }
  for (const refund of filteredPage.data) {
    TestValidator.equals(
      "filtered rows belong to authenticated customer",
      refund.customer.id,
      customer.id,
    );
    TestValidator.equals(
      "filtered status matches request",
      refund.status,
      sample.status,
    );
    TestValidator.equals("filtered rows are active", refund.deleted_at, null);
    if (filteredRequest.reviewerRole !== undefined) {
      TestValidator.equals(
        "filtered reviewer role matches request",
        refund.reviewer_role,
        filteredRequest.reviewerRole,
      );
    }
    if (filteredRequest.orderCode !== undefined) {
      TestValidator.equals(
        "filtered order code matches request",
        refund.orderItem.shipment?.order.code,
        filteredRequest.orderCode,
      );
    }
    if (
      filteredRequest.deliveredAtFrom !== undefined &&
      filteredRequest.deliveredAtTo !== undefined
    ) {
      TestValidator.predicate(
        "filtered delivered_at is within inclusive boundary",
        refund.orderItem.delivered_at !== null &&
          refund.orderItem.delivered_at >= filteredRequest.deliveredAtFrom &&
          refund.orderItem.delivered_at <= filteredRequest.deliveredAtTo,
      );
    }
    TestValidator.predicate(
      "filtered search term matches reason, review note, or order code",
      refund.reason.includes(searchTerm) ||
        (refund.review_note !== null &&
          refund.review_note.includes(searchTerm)) ||
        (refund.orderItem.shipment !== null &&
          refund.orderItem.shipment.order.code.includes(searchTerm)),
    );
  }
}
