import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_cancellation_request_snapshots_list_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // STEP 1: Parallel authentication for all actors
  const adminConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const [adminAuth, customerAuth, sellerAuth] = await Promise.all([
    authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    }),
    authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    }),
    authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    }),
  ]);
  typia.assert(adminAuth);
  typia.assert(customerAuth);
  typia.assert(sellerAuth);
  // STEP 2: Create cancellation request as customer
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  typia.assert(cancellationRequest.id);
  // STEP 3: Seller responds to the cancellation request (creating first snapshot)
  const responseReason = RandomGenerator.paragraph({ sentences: 2 });
  const respondedCancellationRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
          responseReason,
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(respondedCancellationRequest);
  // STEP 4: Admin queries snapshots with default pagination
  const defaultPageSize = 20;
  const snapshotsResponseDefault =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1 as number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1>,
          limit: defaultPageSize as number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: null,
          statusAfter: null,
          sortField: null,
          sortOrder: null,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponseDefault);
  // STEP 5: Admin queries snapshots with custom page size (limit 10)
  const customPageSize = 10;
  const snapshotsResponseCustomLimit =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1 as number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1>,
          limit: customPageSize as number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: null,
          statusAfter: null,
          sortField: null,
          sortOrder: null,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponseCustomLimit);
  // STEP 6: Admin queries snapshots sorted by created_at descending
  const snapshotsResponseSorted =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1 as number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1>,
          limit: defaultPageSize as number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: null,
          statusAfter: null,
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponseSorted);
  // STEP 7: Admin queries snapshots with status transition filter
  const snapshotsResponseFiltered =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1 as number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1>,
          limit: defaultPageSize as number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: "pending",
          statusAfter: "approved",
          sortField: null,
          sortOrder: null,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponseFiltered);
  // STEP 8: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    snapshotsResponseDefault.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    snapshotsResponseDefault.pagination.limit === defaultPageSize,
  );
  TestValidator.predicate(
    "pagination total records is valid",
    snapshotsResponseDefault.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is valid",
    snapshotsResponseDefault.pagination.pages >= 0,
  );
  // STEP 9: Validate custom page size pagination
  TestValidator.predicate(
    "custom page size limit matches request",
    snapshotsResponseCustomLimit.pagination.limit === customPageSize,
  );
  // STEP 10: Validate snapshot data structure if records exist
  if (snapshotsResponseDefault.data.length > 0) {
    const firstSnapshot = snapshotsResponseDefault.data[0];
    // Validate snapshot has all required fields
    typia.assert<IEcommerceMallCancellationRequestSnapshot.ISummary>(
      firstSnapshot,
    );
    // Validate that snapshots capture state transition correctly
    TestValidator.predicate(
      "snapshot status_before is valid",
      firstSnapshot.statusBefore === "pending",
    );
    TestValidator.predicate(
      "snapshot status_after is valid",
      firstSnapshot.statusAfter === "approved" ||
        firstSnapshot.statusAfter === "rejected",
    );
    TestValidator.predicate(
      "snapshot created_at is valid datetime",
      new Date(firstSnapshot.createdAt).getTime() > 0,
    );
  }
  // STEP 11: Validate filtered results capture correct state transition
  snapshotsResponseFiltered.data.forEach((snapshot) => {
    TestValidator.equals(
      "filtered snapshot status_before matches filter",
      snapshot.statusBefore,
      "pending",
    );
    TestValidator.equals(
      "filtered snapshot status_after matches filter",
      snapshot.statusAfter,
      "approved",
    );
  });
  // STEP 12: Validate sorted results are ordered by created_at descending
  if (snapshotsResponseSorted.data.length > 1) {
    for (let i = 0; i < snapshotsResponseSorted.data.length - 1; i++) {
      const current = new Date(
        snapshotsResponseSorted.data[i].createdAt,
      ).getTime();
      const next = new Date(
        snapshotsResponseSorted.data[i + 1].createdAt,
      ).getTime();
      TestValidator.predicate(
        `snapshot ${i} created_at >= snapshot ${i + 1} created_at (descending order)`,
        current >= next,
      );
    }
  }
}
