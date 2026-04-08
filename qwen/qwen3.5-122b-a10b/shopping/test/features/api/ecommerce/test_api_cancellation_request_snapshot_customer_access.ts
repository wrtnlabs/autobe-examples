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

export async function test_api_cancellation_request_snapshot_customer_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
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
  // 2. Create and authenticate seller
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
  // Generate random UUIDs for the test (in simulation mode, these will work with mock data)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Customer retrieves cancellation request snapshot
  const snapshot =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.snapshots.at(
      customerConnection,
      {
        orderId,
        itemId,
        requestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot structure
  TestValidator.equals("snapshot id matches", snapshot.id, snapshotId);
  TestValidator.equals(
    "cancellation request id matches",
    snapshot.ecommerceCancellationRequestId,
    requestId,
  );
  TestValidator.predicate(
    "has status before",
    snapshot.statusBefore.length > 0,
  );
  TestValidator.predicate("has status after", snapshot.statusAfter.length > 0);
  TestValidator.predicate(
    "has changed by actor id",
    snapshot.changedByActorId.length > 0,
  );
  TestValidator.predicate(
    "has changed by actor type",
    snapshot.changedByActorType.length > 0,
  );
  TestValidator.predicate("has created at", snapshot.createdAt.length > 0);
}
