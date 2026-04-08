import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_orders_items_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

export async function test_api_cancellation_request_snapshots_after_seller_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
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
  // 2. Seller registration and authentication
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
  // 3. Create cancellation request (customer action)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const cancellationRequest =
    await api.functional.ecommerce.customer.orders.items.cancellation_requests.create(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          reason,
        } satisfies IEcommerceCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals("initial status", cancellationRequest.status, "pending");
  // 4. Seller approves the cancellation request
  const sellerResponse = RandomGenerator.paragraph({ sentences: 2 });
  const updatedRequest =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.update(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId: cancellationRequest.id,
        body: {
          status: "approved",
          seller_response: sellerResponse,
        } satisfies IEcommerceCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  TestValidator.equals("updated status", updatedRequest.status, "approved");
  // 5. Customer retrieves snapshots to verify audit trail
  const snapshots =
    await api.functional.ecommerce.customer.orders.items.cancellation_requests.snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        requestId: cancellationRequest.id,
        body: {},
      },
    );
  typia.assert(snapshots);
  // 6. Validate snapshot contains correct audit information
  TestValidator.predicate(
    "has at least one snapshot",
    snapshots.data.length > 0,
  );
  const approvalSnapshot = snapshots.data.find(
    (snapshot) =>
      snapshot.status_before === "pending" &&
      snapshot.status_after === "approved",
  );
  TestValidator.predicate(
    "found approval snapshot with pending->approved transition",
    approvalSnapshot !== undefined,
  );
  if (approvalSnapshot) {
    TestValidator.equals(
      "status_before is pending",
      approvalSnapshot.status_before,
      "pending",
    );
    TestValidator.equals(
      "status_after is approved",
      approvalSnapshot.status_after,
      "approved",
    );
    TestValidator.equals(
      "changed_by_actor_type is seller",
      approvalSnapshot.changed_by_actor_type,
      "seller",
    );
    TestValidator.equals(
      "changed_by_actor_id matches seller ID",
      approvalSnapshot.changed_by_actor_id,
      seller.id,
    );
    TestValidator.predicate(
      "snapshot has valid timestamp",
      new Date(approvalSnapshot.created_at).getTime() > 0,
    );
  }
}
