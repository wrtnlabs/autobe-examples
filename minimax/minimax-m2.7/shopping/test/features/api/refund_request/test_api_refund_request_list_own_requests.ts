import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_refund_request_list_own_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  // 2. Call the refund requests listing endpoint with empty request body
  const response =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  // 3. Validate response with typia.assert
  typia.assert(response);
  // 4. Validate pagination metadata structure
  // IPageIEcommerceMall.IPagination has { pagination: IPage.IPagination, data: IEcommerceMall.IPagination[] }
  // The actual pagination fields are in response.pagination.pagination (which is IPage.IPagination)
  const pagePagination = response.pagination.pagination;
  TestValidator.equals("current is valid", pagePagination.current >= 0, true);
  TestValidator.equals("limit is valid", pagePagination.limit >= 0, true);
  TestValidator.equals("records is valid", pagePagination.records >= 0, true);
  TestValidator.equals("pages is valid", pagePagination.pages >= 0, true);
  // 5. Validate data is an array
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // 6. Validate data length within pagination limit
  TestValidator.equals(
    "data length within pagination",
    response.data.length <= pagePagination.limit,
    true,
  );
  // 7. Validate refund request summary structure for each item
  // response.data is IEcommerceMallRefundRequest.ISummary[]
  for (const refundRequest of response.data) {
    TestValidator.equals("has id", refundRequest.id !== undefined, true);
    TestValidator.equals(
      "has reason",
      refundRequest.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "has status",
      refundRequest.status !== undefined,
      true,
    );
    TestValidator.equals(
      "has sellerResponseAt",
      refundRequest.sellerResponseAt !== undefined,
      true,
    );
    TestValidator.equals(
      "has createdAt",
      refundRequest.createdAt !== undefined,
      true,
    );
    TestValidator.equals(
      "has updatedAt",
      refundRequest.updatedAt !== undefined,
      true,
    );
    TestValidator.equals(
      "has customer",
      refundRequest.customer !== undefined,
      true,
    );
    TestValidator.equals(
      "has seller",
      refundRequest.seller !== undefined,
      true,
    );
    TestValidator.equals(
      "has orderItem",
      refundRequest.orderItem !== undefined,
      true,
    );
    // 8. Verify the refund request belongs to the authenticated customer
    TestValidator.equals(
      "customer belongs to authenticated user",
      refundRequest.customer.id,
      authorized.id,
    );
  }
}
