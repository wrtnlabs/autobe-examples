import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_refund_request_list_with_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer to enable authorized access to refund request listing
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Search refund requests by reason text with pagination
  const searchBody = {
    search: "defective",
    limit: 10,
    sortField: "submittedAt",
    sortOrder: "desc",
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const firstPage =
    await api.functional.ecommerceMall.customer.refundRequests.index(
      customerConnection,
      { body: searchBody },
    );
  typia.assert(firstPage);
  // 3. Validate pagination metadata exists and limit matches request
  TestValidator.equals(
    "pagination limit matches request",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "has valid data array",
    Array.isArray(firstPage.data),
  );
  // 4. Test pagination by fetching next page if available
  if (firstPage.pagination.pages > firstPage.pagination.current) {
    const nextPageBody = {
      ...searchBody,
      page: firstPage.pagination.current + 1,
    } satisfies IEcommerceMallRefundRequest.IRequest;
    const secondPage =
      await api.functional.ecommerceMall.customer.refundRequests.index(
        customerConnection,
        { body: nextPageBody },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      firstPage.pagination.current + 1,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  }
  // 5. Validate each refund request summary includes complete related entity information
  for (const refundRequest of firstPage.data) {
    TestValidator.predicate(
      "product name is populated",
      refundRequest.productName.length > 0,
    );
    TestValidator.predicate(
      "seller shop name is populated",
      refundRequest.sellerShopName.length > 0,
    );
    TestValidator.equals(
      "customer display name matches",
      refundRequest.customerDisplayName,
      customer.profile.displayName,
    );
    TestValidator.predicate(
      "has valid refund request status",
      ["pending", "approved", "rejected"].includes(refundRequest.status),
    );
  }
}
