import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_cancellation_request_snapshot_customer_list_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create cancellation request
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  // 3. Request snapshots with descending order (newest first)
  const descBody = {
    page: 1,
    limit: 20,
    createdAtFrom: null,
    createdAtTo: null,
    statusBefore: null,
    statusAfter: null,
    sortField: "created_at" as const,
    sortOrder: "desc" as const,
  } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest;
  const descResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: descBody,
      },
    );
  typia.assert(descResponse);
  // 4. Validate pagination matches request parameters
  TestValidator.equals(
    "current page matches request",
    descResponse.pagination.current,
    descBody.page,
  );
  TestValidator.equals(
    "limit matches request",
    descResponse.pagination.limit,
    descBody.limit,
  );
  // 5. Test with ascending sort order
  const ascBody = {
    page: 1,
    limit: 20,
    createdAtFrom: null,
    createdAtTo: null,
    statusBefore: null,
    statusAfter: null,
    sortField: "created_at" as const,
    sortOrder: "asc" as const,
  } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest;
  const ascResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: ascBody,
      },
    );
  typia.assert(ascResponse);
  // 6. Validate ascending pagination
  TestValidator.equals(
    "ascending current page matches request",
    ascResponse.pagination.current,
    ascBody.page,
  );
  TestValidator.equals(
    "ascending limit matches request",
    ascResponse.pagination.limit,
    ascBody.limit,
  );
  // 7. Verify snapshot content indicates state transitions (business logic check)
  if (descResponse.data.length > 0) {
    descResponse.data.forEach((snapshot, index) => {
      // Status transitions should show different values or be documented
      // This tests that snapshots capture meaningful state changes
      TestValidator.predicate(
        `snapshot ${index} documents a state transition`,
        snapshot.statusBefore !== snapshot.statusAfter ||
          snapshot.reasonBefore !== snapshot.reasonAfter ||
          snapshot.reviewerNote !== null,
      );
    });
  }
}
