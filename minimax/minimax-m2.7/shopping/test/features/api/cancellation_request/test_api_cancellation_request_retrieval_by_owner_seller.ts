import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cancellation_request_retrieval_by_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller who owns the cancellation request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Retrieve cancellation request by ID
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.at(
      sellerConnection,
      { requestId },
    );
  typia.assert(cancellationRequest);
  // 3. Validate response structure
  TestValidator.equals(
    "has valid request ID",
    cancellationRequest.id,
    requestId,
  );
  TestValidator.predicate(
    "has non-empty reason",
    cancellationRequest.reason.length > 0,
  );
  TestValidator.equals(
    "has valid status",
    ["pending", "approved", "rejected"].includes(cancellationRequest.status),
    true,
  );
  TestValidator.predicate("has created_at", !!cancellationRequest.created_at);
  TestValidator.predicate("has updated_at", !!cancellationRequest.updated_at);
  // 4. Validate order item structure
  TestValidator.equals(
    "has order item",
    cancellationRequest.orderItem !== null,
    true,
  );
  if (cancellationRequest.orderItem) {
    TestValidator.predicate(
      "has valid order item ID",
      /^[0-9a-f-]{36}$/i.test(cancellationRequest.orderItem.id),
    );
    TestValidator.predicate(
      "has valid quantity",
      cancellationRequest.orderItem.quantity >= 0,
    );
    TestValidator.predicate(
      "has valid unit_price",
      cancellationRequest.orderItem.unit_price >= 0,
    );
    TestValidator.predicate(
      "has valid subtotal",
      cancellationRequest.orderItem.subtotal > 0,
    );
  }
  // 5. Validate product snapshot
  if (cancellationRequest.orderItem?.productSnapshot) {
    TestValidator.predicate(
      "has valid product snapshot ID",
      /^[0-9a-f-]{36}$/i.test(cancellationRequest.orderItem.productSnapshot.id),
    );
  }
  // 6. Validate seller profile snapshot
  TestValidator.equals(
    "has seller profile snapshot",
    cancellationRequest.orderItem?.sellerProfileSnapshot !== null,
    true,
  );
  // 7. Validate customer information
  TestValidator.equals(
    "has customer info",
    cancellationRequest.customer !== null,
    true,
  );
  if (cancellationRequest.customer) {
    TestValidator.predicate(
      "has valid customer ID",
      /^[0-9a-f-]{36}$/i.test(cancellationRequest.customer.id),
    );
    TestValidator.predicate(
      "has valid customer email",
      cancellationRequest.customer.email.includes("@"),
    );
  }
  // 8. Validate seller information
  TestValidator.equals(
    "has seller info",
    cancellationRequest.seller !== null,
    true,
  );
  if (cancellationRequest.seller) {
    TestValidator.predicate(
      "has valid seller ID",
      /^[0-9a-f-]{36}$/i.test(cancellationRequest.seller.id),
    );
    TestValidator.predicate(
      "has valid seller email",
      cancellationRequest.seller.email.includes("@"),
    );
  }
  // 9. Validate snapshots array exists
  TestValidator.equals(
    "has snapshots array",
    Array.isArray(cancellationRequest.snapshots),
    true,
  );
}
