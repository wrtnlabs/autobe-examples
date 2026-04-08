import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Administrator retrieves a cancellation request that has been approved by the seller.
 *
 * Validates that administrators can access cancellation request details through the admin endpoint. This test verifies the response structure includes the cancellation request status, seller response rationale, and embedded order item context when an admin retrieves an approved cancellation request.
 *
 * The test authenticates as an administrator and calls the admin-specific endpoint to retrieve a cancellation request, validating the response conforms to the expected structure with all required fields properly populated.
 *
 * 1. Administrator authenticates with credentials to access admin-only endpoints.
 * 2. Administrator calls the admin cancellation request retrieval endpoint with UUID parameters.
 * 3. Validates response includes cancellation request ID, status, reason, seller response, timestamps, and embedded order item summary.
 */
export async function test_api_admin_cancellation_request_approved_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized =
    await api.functional.ecommerce.auth.admin.join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // 2. Admin retrieves cancellation request (using random UUIDs for testing endpoint structure)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const cancellationRequest: IEcommerceCancellationRequest =
    await api.functional.ecommerce.admin.orders.items.cancellation_requests.at(
      adminConnection,
      {
        orderId,
        itemId,
        requestId,
      },
    );
  typia.assert(cancellationRequest);
  // 3. Validate response structure
  TestValidator.equals(
    "cancellation request ID matches",
    cancellationRequest.id,
    requestId,
  );
  TestValidator.predicate(
    "status is valid string",
    typeof cancellationRequest.status === "string",
  );
  TestValidator.predicate(
    "reason is non-empty string",
    typeof cancellationRequest.reason === "string" &&
      cancellationRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "seller response is string or null",
    cancellationRequest.sellerResponse === null ||
      typeof cancellationRequest.sellerResponse === "string",
  );
  TestValidator.predicate(
    "createdAt is valid date-time",
    typeof cancellationRequest.createdAt === "string",
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    typeof cancellationRequest.updatedAt === "string",
  );
  TestValidator.predicate(
    "order item is embedded",
    cancellationRequest.orderItem !== null &&
      cancellationRequest.orderItem !== undefined,
  );
}
