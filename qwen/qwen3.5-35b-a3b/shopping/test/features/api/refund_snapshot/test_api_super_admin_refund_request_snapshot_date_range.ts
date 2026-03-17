import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_super_admin_refund_request_snapshot_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Super admin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Step 2: Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Step 3: Customer creates refund request at time T1
  const T1 = new Date();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerConnection,
      {
        orderItemId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
          evidence_description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Wait for time progression to simulate T2 (seller approval)
  await new Promise((resolve) => setTimeout(resolve, 100));
  const T2 = new Date();
  // Step 4: Super admin queries snapshots with date range filter
  const snapshotFilter: IEcommerceMallRefundRequestSnapshot.IRequest = {
    created_at_after: T1.toISOString(),
    created_at_before: T2.toISOString(),
    sort_by: "created_at" as const,
    sort_order: "DESC" as const,
    limit: 50,
  };
  const snapshotResponse =
    await api.functional.ecommerceMall.superAdmin.refund_requests.snapshots.index(
      superAdminConnection,
      {
        refundRequestId: refundRequest.id,
        body: snapshotFilter,
      },
    );
  typia.assert(snapshotResponse);
  // Verify at least one snapshot exists within date range
  TestValidator.predicate(
    "snapshots within date range",
    snapshotResponse.data.length >= 1,
  );
  // Verify all returned snapshots are within date range
  for (const snapshot of snapshotResponse.data) {
    typia.assert(snapshot);
    const snapshotCreatedAt = new Date(snapshot.createdAt);
    TestValidator.predicate(
      `snapshot ${snapshot.id} createdAt after T1`,
      snapshotCreatedAt >= T1,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} createdAt before T2`,
      snapshotCreatedAt < T2,
    );
  }
  // Verify snapshot data structure
  if (snapshotResponse.data.length > 0) {
    const snapshot = snapshotResponse.data[0];
    // Verify snapshot has required properties
    TestValidator.predicate(
      "snapshot has refundRequestId",
      snapshot.refundRequestId !== null &&
        snapshot.refundRequestId !== undefined,
    );
    // Verify refundRequestId matches original
    TestValidator.equals(
      "snapshot refundRequestId matches",
      snapshot.refundRequestId,
      refundRequest.id,
    );
    // Verify actorType is valid enum value
    TestValidator.predicate(
      "snapshot actorType is valid",
      ["customer", "seller", "admin", "super_admin"].includes(
        snapshot.actorType,
      ),
    );
    // Verify actionType is valid enum value
    TestValidator.predicate(
      "snapshot actionType is valid",
      [
        "created",
        "status_changed",
        "approved",
        "rejected",
        "response_added",
      ].includes(snapshot.actionType),
    );
    // Verify createdAt is valid ISO 8601 format (typia.assert already validates this)
    new Date(snapshot.createdAt);
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination current is valid",
    snapshotResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    snapshotResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is valid",
    snapshotResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    snapshotResponse.pagination.pages >= 0,
  );
  // Verify records match actual data length
  TestValidator.equals(
    "pagination records matches data length",
    snapshotResponse.pagination.records,
    snapshotResponse.data.length,
  );
}
