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
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_orders_items_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

export async function test_api_admin_view_cancellation_request_snapshots_with_status_and_actor_filters(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator viewing cancellation request snapshots with filtering by status and actor type.
   *
   * This test validates the admin endpoint for retrieving cancellation request snapshots with various filter criteria. It ensures administrators can audit status transitions by filtering on previous status, new status, and the actor type who made the change.
   *
   * The test workflow creates a complete cancellation request lifecycle: customer submits request (pending), seller approves it (approved), generating a snapshot. The admin then queries snapshots with filters to verify the filtering logic works correctly.
   *
   * 1. Create admin, customer, and seller actors with authentication.
   * 2. Customer creates a cancellation request for an order item.
   * 3. Seller approves the cancellation request, creating a snapshot.
   * 4. Admin queries snapshots filtered by status_before='pending', status_after='approved', and changed_by_actor_type='seller'.
   * 5. Validates that filtered results contain the expected snapshot with correct status transition and actor type.
   * 6. Tests pagination parameters (page, limit) are respected.
   * 7. Tests filtering by actor type 'admin' returns empty results (since seller made the change).
   */
  // Store passwords and emails from join operations for subsequent login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  // 1. Create admin, customer, and seller actors
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminAuth);
  // Admin login - IEcommerceAdmin.ILogin only has email and password (no href/referrer)
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuth);
  // Seller login - IEcommerceSeller.ILogin includes href and referrer
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate UUIDs for order, item, and cancellation request
  // Note: In simulation mode, these UUIDs are validated but don't need to exist in database
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Customer creates cancellation request
  const cancellationRequest =
    await api.functional.ecommerce.customer.orders.items.cancellation_requests.create(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 4. Seller approves cancellation request (creates snapshot)
  const updatedRequest =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.update(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId: cancellationRequest.id,
        body: {
          status: "approved",
          seller_response: "Approved for customer satisfaction",
        } satisfies IEcommerceCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Admin views snapshots with filters
  const snapshots =
    await api.functional.ecommerce.admin.orders.items.cancellation_requests.snapshots.index(
      adminConnection,
      {
        orderId,
        itemId,
        requestId: cancellationRequest.id,
        body: {
          status_before: "pending",
          status_after: "approved",
          changed_by_actor_type: "seller",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Validate filtered results
  TestValidator.equals(
    "snapshot count matches filter",
    snapshots.data.length,
    1,
  );
  TestValidator.equals(
    "status_before is pending",
    snapshots.data[0].status_before,
    "pending",
  );
  TestValidator.equals(
    "status_after is approved",
    snapshots.data[0].status_after,
    "approved",
  );
  TestValidator.equals(
    "changed_by_actor_type is seller",
    snapshots.data[0].changed_by_actor_type,
    "seller",
  );
  // 7. Test pagination with limit=1
  const paginatedSnapshots =
    await api.functional.ecommerce.admin.orders.items.cancellation_requests.snapshots.index(
      adminConnection,
      {
        orderId,
        itemId,
        requestId: cancellationRequest.id,
        body: {
          status_before: "pending",
          status_after: "approved",
          changed_by_actor_type: "seller",
          page: 1,
          limit: 1,
        } satisfies IEcommerceCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "pagination limit respected",
    paginatedSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    paginatedSnapshots.pagination.records,
    1,
  );
  // 8. Test filtering by actor type 'admin' returns empty (seller made the change)
  const adminActorSnapshots =
    await api.functional.ecommerce.admin.orders.items.cancellation_requests.snapshots.index(
      adminConnection,
      {
        orderId,
        itemId,
        requestId: cancellationRequest.id,
        body: {
          changed_by_actor_type: "admin",
        } satisfies IEcommerceCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(adminActorSnapshots);
  TestValidator.equals(
    "admin actor filter returns empty",
    adminActorSnapshots.data.length,
    0,
  );
}
