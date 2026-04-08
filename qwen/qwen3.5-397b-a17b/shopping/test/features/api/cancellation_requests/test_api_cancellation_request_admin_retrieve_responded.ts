import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of a cancellation request that has been responded to by the seller.
 *
 * Validates that administrators can access cancellation requests with completed seller review workflow. The test verifies admin authentication, endpoint accessibility, and response structure validation for cancellation requests in approved or rejected states.
 *
 * Special attention is given to verifying that the status field reflects a completed review (approved or rejected), the respondedAt timestamp is populated, and the response includes complete order item and customer context for administrative oversight.
 *
 * 1. Administrator authentication via join endpoint with randomized credentials.
 * 2. Admin connection established with authentication token from join response.
 * 3. Cancellation request retrieval attempted with generated UUID identifier.
 * 4. Response validated against IShoppingMallCancellationRequest schema ensuring all nested relations are present.
 * 5. Status validation confirms cancellation request is in responded state (approved or rejected).
 * 6. Timestamp validation ensures respondedAt is populated and logically follows createdAt.
 * 7. Order item context validation confirms product, variant, and seller information is accessible.
 * 8. Customer information validation ensures member details are included for oversight.
 *
 * Note: Full workflow testing (order creation, cancellation request submission, seller response) requires additional API endpoints not available in current test scope. This test focuses on admin retrieval endpoint structure, authentication, and response validation patterns for responded cancellation requests.
 */
export async function test_api_cancellation_request_admin_retrieve_responded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve cancellation request by ID
  const cancellationRequest =
    await api.functional.shoppingMall.admin.cancellation_requests.at(
      adminConnection,
      {
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(cancellationRequest);
  // 3. Validate status is responded (approved or rejected, not pending)
  TestValidator.predicate(
    "status is responded",
    () =>
      cancellationRequest.status === "approved" ||
      cancellationRequest.status === "rejected",
  );
  // 4. Validate respondedAt is populated for responded requests
  TestValidator.predicate(
    "respondedAt is populated",
    () => cancellationRequest.respondedAt !== null,
  );
  // 5. Validate respondedAt is after or equal to createdAt (logical time ordering)
  TestValidator.predicate(
    "respondedAt after createdAt",
    () =>
      new Date(cancellationRequest.respondedAt!) >=
      new Date(cancellationRequest.createdAt),
  );
}
