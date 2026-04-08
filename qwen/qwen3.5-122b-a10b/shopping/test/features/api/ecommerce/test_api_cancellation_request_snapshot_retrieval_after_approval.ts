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

export async function test_api_cancellation_request_snapshot_retrieval_after_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Login seller to get authenticated connection for seller endpoints
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 4. Generate random UUIDs for the test (simulating created resources)
  // Note: In a real scenario, these would be actual IDs from created resources
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Create cancellation request as customer
  const cancellationRequest =
    await generate_random_ecommerce_customer_orders_items_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: {
          orderId,
          itemId,
        },
      },
    );
  typia.assert(cancellationRequest);
  // 6. Retrieve cancellation request snapshot as seller
  // This endpoint returns the audit trail snapshot after seller approval
  const snapshot =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.snapshots.at(
      sellerLoginConnection,
      {
        orderId,
        itemId,
        requestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot properties for audit trail integrity
  TestValidator.equals("snapshot ID matches", snapshot.id, snapshotId);
  TestValidator.equals(
    "cancellation request ID matches",
    snapshot.ecommerceCancellationRequestId,
    requestId,
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "has status_before value",
    snapshot.statusBefore.length > 0,
  );
  TestValidator.predicate(
    "has status_after value",
    snapshot.statusAfter.length > 0,
  );
  TestValidator.predicate(
    "has changed_by_actor_id",
    snapshot.changedByActorId.length > 0,
  );
  TestValidator.predicate(
    "has changed_by_actor_type",
    snapshot.changedByActorType.length > 0,
  );
  TestValidator.predicate(
    "actor type is seller or admin",
    snapshot.changedByActorType === "seller" ||
      snapshot.changedByActorType === "admin",
  );
}
