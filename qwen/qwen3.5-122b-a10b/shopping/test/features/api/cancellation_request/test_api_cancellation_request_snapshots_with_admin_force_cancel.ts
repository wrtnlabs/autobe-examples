import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestSnapshot";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequestSnapshot";
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
import { generate_random_ecommerce_customer_orders_items_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

export async function test_api_cancellation_request_snapshots_with_admin_force_cancel(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Admin joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 3. Generate random order and item IDs
  // Note: In a real scenario, these would come from actual order creation
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Customer creates a cancellation request for the order item
  const cancellationRequest =
    await generate_random_ecommerce_customer_orders_items_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceCancellationRequest.ICreate,
        params: {
          orderId,
          itemId,
        },
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 5. Admin force-cancels the order item
  const forceCancelledItem =
    await api.functional.ecommerce.admin.orders.items.force_cancel.forceCancel(
      adminConnection,
      {
        orderId,
        itemId,
        body: {
          reason: "Administrative force-cancel for testing",
        } satisfies IEcommerceOrderItem.IForceCancel,
      },
    );
  typia.assert(forceCancelledItem);
  TestValidator.equals(
    "order item status after force-cancel",
    forceCancelledItem.status,
    "cancelled",
  );
  // 6. Customer retrieves cancellation request snapshots
  const snapshots =
    await api.functional.ecommerce.customer.orders.items.cancellation_requests.snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        requestId: cancellationRequest.id,
        body: {} satisfies IEcommerceCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 7. Validate snapshots contain admin actor type and correct status transition
  TestValidator.predicate("snapshots exist", snapshots.data.length > 0);
  // Find the snapshot created by admin
  const adminSnapshot = snapshots.data.find(
    (snapshot) => snapshot.changed_by_actor_type === "admin",
  );
  TestValidator.predicate("admin snapshot exists", adminSnapshot !== undefined);
  if (adminSnapshot) {
    // Validate admin actor information
    TestValidator.equals(
      "admin actor type",
      adminSnapshot.changed_by_actor_type,
      "admin",
    );
    TestValidator.predicate(
      "admin actor ID is valid UUID",
      /^[0-9a-f-]{36}$/i.test(adminSnapshot.changed_by_actor_id),
    );
    // Validate status transition - should show pending -> approved/cancelled
    TestValidator.equals(
      "status before is pending",
      adminSnapshot.status_before,
      "pending",
    );
    TestValidator.predicate(
      "status after is approved or cancelled",
      adminSnapshot.status_after === "approved" ||
        adminSnapshot.status_after === "cancelled",
    );
    // Validate timestamp exists and is valid
    TestValidator.predicate(
      "snapshot has valid timestamp",
      new Date(adminSnapshot.created_at).getTime() > 0,
    );
    // Validate admin actor ID matches the authenticated admin
    TestValidator.equals(
      "admin actor ID matches authenticated admin",
      adminSnapshot.changed_by_actor_id,
      admin.id,
    );
  }
}
