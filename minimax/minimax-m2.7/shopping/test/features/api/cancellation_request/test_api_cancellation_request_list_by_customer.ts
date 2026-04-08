import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cancellation_request_list_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Retrieve cancellation requests without any filters
  const request: IEcommerceMallCancellationRequest.IRequest = {};
  const result =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: request satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "has pagination metadata",
    result.pagination !== null && result.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "pagination has current page",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    result.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 5. If there are cancellation requests, validate their structure
  for (const item of result.data) {
    typia.assert(item);
    TestValidator.predicate("has valid id", item.id.length > 0);
    TestValidator.predicate(
      "has reason",
      item.reason !== null && item.reason !== undefined,
    );
    TestValidator.predicate(
      "has status",
      item.status === "pending" ||
        item.status === "approved" ||
        item.status === "rejected",
    );
    TestValidator.predicate(
      "has createdAt",
      item.createdAt !== null && item.createdAt !== undefined,
    );
    // Validate nested cancellation request structure
    typia.assert(item.cancellationRequest);
    TestValidator.predicate(
      "has cancellation request id",
      item.cancellationRequest.id.length > 0,
    );
  }
}
