import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cancellation_request_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Get list of cancellation requests to find one with snapshots
  const cancellationRequestsPage =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(cancellationRequestsPage);
  // 3. Test pagination with the first request that has snapshots (if available)
  // Otherwise test with pagination structure validation
  const testRequestId =
    cancellationRequestsPage.data.length > 0
      ? cancellationRequestsPage.data[0].id
      : typia.random<string & tags.Format<"uuid">>();
  // Test with explicit pagination parameters
  const pageParam = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const limitParam = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const snapshotsPage =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        requestId: testRequestId,
        body: {
          page: pageParam,
          limit: limitParam,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "pagination.current is valid",
    typeof snapshotsPage.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination.limit is valid",
    typeof snapshotsPage.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination.records is valid",
    typeof snapshotsPage.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination.pages is valid",
    typeof snapshotsPage.pagination.pages === "number",
    true,
  );
  // 5. Validate pagination metadata values are non-negative
  TestValidator.predicate(
    "pagination.current is non-negative",
    snapshotsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    snapshotsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    snapshotsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    snapshotsPage.pagination.pages >= 0,
  );
  // 6. Validate response data array exists and is an array
  TestValidator.equals(
    "data is an array",
    Array.isArray(snapshotsPage.data),
    true,
  );
  // 7. Validate pages calculation is correct
  if (snapshotsPage.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      snapshotsPage.pagination.records / snapshotsPage.pagination.limit,
    );
    TestValidator.equals(
      "pages matches records/limit calculation",
      snapshotsPage.pagination.pages,
      expectedPages,
    );
  }
  // 8. Test second page with different limit to verify pagination works
  const secondPageSnapshots =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        requestId: testRequestId,
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(secondPageSnapshots);
  // Validate second page response structure matches
  TestValidator.equals(
    "second page has pagination metadata",
    secondPageSnapshots.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "second page pagination.current is 2",
    secondPageSnapshots.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page pagination.limit is 5",
    secondPageSnapshots.pagination.limit,
    5,
  );
}
