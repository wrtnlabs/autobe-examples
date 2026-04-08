import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

/**
 * Test successful retrieval of a refund request snapshot by an administrator.
 *
 * This test validates that administrators can retrieve immutable snapshots of refund requests
 * that were created when sellers respond to refund requests. The snapshots preserve the
 * complete state at the moment of response for audit and dispute resolution purposes.
 */
export async function test_api_refund_request_snapshot_admin_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 4. Customer creates a refund request
  const refundReason = RandomGenerator.paragraph({ sentences: 3 });
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: refundReason,
        } satisfies Partial<IEcommerceMallRefundRequest.ICreate>,
      },
    );
  typia.assert(refundRequest);
  // Validate refund request was created with pending status
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  // 5. Seller responds to the refund request (approves it)
  // This creates an immutable snapshot automatically
  const sellerResponse =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "approved",
          responseReason: "Refund approved as per policy",
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(sellerResponse);
  // Validate the refund request was updated
  TestValidator.equals(
    "refund request status updated to approved",
    sellerResponse.status,
    "approved",
  );
  // Ensure at least one snapshot exists
  TestValidator.predicate(
    "snapshots array has at least one entry",
    sellerResponse.snapshots.length > 0,
  );
  // Get the first (most recent) snapshot
  const snapshot = sellerResponse.snapshots[0];
  typia.assert(snapshot);
  // 6. Admin retrieves the specific snapshot
  const retrievedSnapshot =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.at(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 7. Validate snapshot data integrity
  TestValidator.equals(
    "snapshot ID matches",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot refund request ID matches",
    retrievedSnapshot.refundRequestId,
    refundRequest.id,
  );
  TestValidator.equals(
    "snapshot reason preserved",
    retrievedSnapshot.reason,
    refundReason,
  );
  TestValidator.equals(
    "snapshot status is approved",
    retrievedSnapshot.status,
    "approved",
  );
  TestValidator.equals(
    "snapshot response reason preserved",
    retrievedSnapshot.responseReason,
    "Refund approved as per policy",
  );
  // Validate createdAt is a valid ISO timestamp
  TestValidator.predicate(
    "snapshot createdAt is valid",
    !isNaN(new Date(retrievedSnapshot.createdAt).getTime()),
  );
}
