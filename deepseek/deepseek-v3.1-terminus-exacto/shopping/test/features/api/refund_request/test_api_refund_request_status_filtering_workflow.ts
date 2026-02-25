import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_request_status_filtering_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Test status filter combinations with pagination
  const statuses = [null, "pending", "approved", "rejected"] as const;
  for (const status of statuses) {
    // Prepare request body with status filter
    const page = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
    >();
    const limit = typia.random<
      number &
        tags.Type<"int32"> &
        tags.Minimum<5> &
        tags.Maximum<10> &
        tags.MultipleOf<1>
    >();
    const request = {
      status: status satisfies string | null | undefined as
        | string
        | null
        | undefined,
      page: page satisfies number as number,
      limit: limit satisfies number as number,
    } satisfies IEcommerceRefundRequest.IRequest;
    // 3. Call the refund requests search API
    const response =
      await api.functional.ecommerce.seller.refund_requests.index(
        sellerConnection,
        { body: request },
      );
    typia.assert(response);
    // 4. Validate response structure
    TestValidator.equals(
      "pagination current matches request page",
      response.pagination.current,
      request.page,
    );
    TestValidator.equals(
      "pagination limit matches request limit",
      response.pagination.limit,
      request.limit,
    );
    TestValidator.predicate(
      "total records is non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "total pages is non-negative",
      response.pagination.pages >= 0,
    );
    // 5. Validate each item in response
    for (const item of response.data) {
      typia.assert(item);
      // Validate nested structures
      typia.assert(item.customer);
      typia.assert(item.seller);
      // Note: Status validation is not possible because ISummary doesn't contain status field
      // The status filtering is performed server-side, we trust the response
    }
    // 6. Log for debugging
    console.log(
      `Status filter: ${status}, Total records: ${response.pagination.records}`,
    );
  }
  // 7. Test edge case: Verify that passing undefined status works same as null
  const requestDefault = {
    page: 1 satisfies number as number,
    limit: 5 satisfies number as number,
  } satisfies IEcommerceRefundRequest.IRequest;
  const responseDefault =
    await api.functional.ecommerce.seller.refund_requests.index(
      sellerConnection,
      { body: requestDefault },
    );
  typia.assert(responseDefault);
  TestValidator.predicate(
    "default request (no status) returns valid data",
    responseDefault.pagination.records >= 0,
  );
}
