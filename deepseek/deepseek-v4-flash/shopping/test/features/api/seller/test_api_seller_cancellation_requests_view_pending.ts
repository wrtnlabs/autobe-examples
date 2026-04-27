import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can view only pending cancellation requests that need their response.
 *
 * Validates the seller-scoped cancellation requests listing endpoint with a pending status filter. Ensures the response includes proper pagination metadata and that returned records correctly represent pending cancellation requests with null timestamps and seller references.
 *
 * 1. Register a seller account with shop profile and credentials.
 * 2. Call the cancellation requests endpoint with status filter set to `['pending']`.
 * 3. Validate pagination structure (current page, limit, records, pages).
 * 4. Validate all returned data items have `status` of `"pending"`.
 * 5. Validate pending items have `responded_at` and `seller` as `null`.
 */
export async function test_api_seller_cancellation_requests_view_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IECommerceMallSeller.IJoin>,
  });
  typia.assert(seller);
  // 2. Call cancellation requests with ['pending'] status filter
  const status: ("pending" | "approved" | "rejected")[] & tags.UniqueItems = [
    "pending",
  ];
  const response =
    await api.functional.eCommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status,
        } satisfies IECommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    () =>
      typeof response.pagination.current === "number" &&
      response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    () =>
      typeof response.pagination.limit === "number" &&
      response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    () =>
      typeof response.pagination.records === "number" &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    () =>
      typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 0,
  );
  // 4. Validate all returned records are pending
  TestValidator.predicate("all items have pending status", () =>
    response.data.every((item) => item.status === "pending"),
  );
  // 5. Validate pending items have null responded_at and null seller
  TestValidator.predicate("pending items have null responded_at", () =>
    response.data.every((item) => item.responded_at === null),
  );
  TestValidator.predicate("pending items have null seller", () =>
    response.data.every((item) => item.seller === null),
  );
}
