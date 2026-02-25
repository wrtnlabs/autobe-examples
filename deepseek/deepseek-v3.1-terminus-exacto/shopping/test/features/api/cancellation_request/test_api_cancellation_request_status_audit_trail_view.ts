import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCancellationRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestStatus";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

export async function test_api_cancellation_request_status_audit_trail_view(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    },
  });
  // Create customer connection and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customerAuth);
  // Create cancellation request using utility function (requires order item setup)
  // Note: This requires a valid order item ID in 'paid' status to work properly
  const cancellationRequest =
    await generate_random_ecommerce_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          ecommerce_order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }).substring(0, 500),
        } satisfies IEcommerceCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // Create initial status transition (pending)
  const initialStatusUpdate =
    await api.functional.ecommerce.customer.cancellation_requests.statuses.update(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          decision: "approved",
          reason: RandomGenerator.paragraph({ sentences: 2 }).substring(0, 500),
        } satisfies IEcommerceCancellationRequest.IUpdate,
      },
    );
  typia.assert(initialStatusUpdate);
  // Retrieve status ID from the updated cancellation request (assuming status transitions are accessible)
  // Note: In a real scenario, we'd need to get status IDs from cancellation request response
  const statusId = typia.random<string & tags.Format<"uuid">>();
  // Administrator retrieves specific status transition record
  const statusTransition =
    await api.functional.ecommerce.administrator.cancellation_requests.statuses.at(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        statusId: statusId,
      },
    );
  typia.assert(statusTransition);
  // Validate the audit trail response structure
  TestValidator.equals(
    "status ID matches requested",
    statusTransition.id,
    statusId,
  );
  TestValidator.predicate(
    "has cancellation request relation",
    statusTransition.cancellationRequest !== undefined,
  );
  TestValidator.equals(
    "cancellation request ID matches",
    statusTransition.cancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.predicate(
    "has valid created timestamp",
    statusTransition.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid updated timestamp",
    statusTransition.updated_at !== undefined,
  );
}
