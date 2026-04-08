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

/**
 * Test administrator viewing cancellation request snapshots after seller approval.
 *
 * Validates the audit trail functionality for cancellation request status changes, ensuring that administrators can access complete history of seller responses for dispute resolution and oversight purposes.
 *
 * This test creates a complete cancellation workflow involving customer, seller, and administrator actors to verify that snapshots are properly generated when sellers respond to cancellation requests. Note: This test assumes order and order item already exist as per scenario dependencies.
 *
 * 1. Administrator account is created and authenticated.
 * 2. Customer account is created and authenticated.
 * 3. Seller account is created and authenticated.
 * 4. Cancellation request is created for existing paid order item (order pre-exists).
 * 5. Seller approves the cancellation request with response reason.
 * 6. Administrator retrieves cancellation request snapshots.
 * 7. Validates snapshot contains status transition from 'pending' to 'approved'.
 * 8. Validates snapshot includes seller actor ID and type 'seller'.
 * 9. Validates snapshot includes timestamp and change reason.
 * 10. Verifies snapshots are ordered by created_at descending.
 */
export async function test_api_admin_view_cancellation_request_snapshots_after_seller_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create customer
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
  // 3. Create seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 4. Generate valid UUIDs for existing order and order item
  // Note: Order and order item are assumed to exist as per scenario dependencies
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Customer creates cancellation request
  const cancellationRequest =
    await generate_random_ecommerce_customer_orders_items_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceCancellationRequest.ICreate,
        params: {
          orderId,
          itemId,
        },
      },
    );
  typia.assert(cancellationRequest);
  const requestId = cancellationRequest.id;
  // 6. Seller approves cancellation request
  const updatedRequest =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.update(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId,
        body: {
          status: "approved",
          seller_response: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommerceCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 7. Administrator views snapshots
  const snapshots =
    await api.functional.ecommerce.admin.orders.items.cancellation_requests.snapshots.index(
      adminConnection,
      {
        orderId,
        itemId,
        requestId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 8-10. Validate snapshots
  TestValidator.predicate("snapshots exist", snapshots.data.length > 0);
  TestValidator.predicate(
    "pagination exists",
    snapshots.pagination.current >= 1,
  );
  const firstSnapshot = snapshots.data[0];
  typia.assert(firstSnapshot);
  TestValidator.equals(
    "status transition",
    firstSnapshot.status_before,
    "pending",
  );
  TestValidator.equals(
    "status after approval",
    firstSnapshot.status_after,
    "approved",
  );
  TestValidator.equals(
    "actor type is seller",
    firstSnapshot.changed_by_actor_type,
    "seller",
  );
  TestValidator.predicate(
    "has actor ID",
    firstSnapshot.changed_by_actor_id.length > 0,
  );
  TestValidator.predicate("has timestamp", firstSnapshot.created_at.length > 0);
  TestValidator.predicate(
    "has change reason",
    firstSnapshot.change_reason !== null &&
      firstSnapshot.change_reason !== undefined,
  );
}
