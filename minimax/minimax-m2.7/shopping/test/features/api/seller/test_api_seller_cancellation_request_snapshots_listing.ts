import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_request_snapshots_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Call cancellation request snapshots endpoint without filters to get paginated results
  const snapshotsPage =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // 3. Validate response structure includes pagination metadata
  TestValidator.equals(
    "has pagination metadata",
    typeof snapshotsPage.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination has current page",
    typeof snapshotsPage.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof snapshotsPage.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records count",
    typeof snapshotsPage.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has total pages",
    typeof snapshotsPage.pagination.pages,
    "number",
  );
  // 4. Validate response includes data array
  TestValidator.equals(
    "has data array",
    Array.isArray(snapshotsPage.data),
    true,
  );
  // 5. If snapshots exist, validate each snapshot structure
  if (snapshotsPage.data.length > 0) {
    const firstSnapshot = snapshotsPage.data[0];
    TestValidator.equals("snapshot has id", typeof firstSnapshot.id, "string");
    TestValidator.equals(
      "snapshot has reason",
      typeof firstSnapshot.reason,
      "string",
    );
    TestValidator.equals(
      "snapshot has status",
      typeof firstSnapshot.status,
      "string",
    );
    TestValidator.equals(
      "snapshot status is approved or rejected",
      firstSnapshot.status === "approved" ||
        firstSnapshot.status === "rejected",
      true,
    );
    TestValidator.equals(
      "snapshot has createdAt",
      typeof firstSnapshot.createdAt,
      "string",
    );
    TestValidator.equals(
      "snapshot has cancellationRequest",
      typeof firstSnapshot.cancellationRequest,
      "object",
    );
  }
  // 6. Test pagination with limit parameter
  const limitedPage =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(limitedPage);
  TestValidator.equals("limit is respected", limitedPage.pagination.limit, 5);
  // 7. Test pagination with page parameter
  const pageTwo =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(pageTwo);
  TestValidator.equals("page is respected", pageTwo.pagination.current, 2);
}
