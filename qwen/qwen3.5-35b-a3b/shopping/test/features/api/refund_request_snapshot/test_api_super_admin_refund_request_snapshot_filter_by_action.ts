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

export async function test_api_super_admin_refund_request_snapshot_filter_by_action(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Create refund request (this generates initial "created" snapshot)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerConnection,
      {
        orderItemId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          evidence_description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 4. Filter snapshots by action_type="approved"
  const snapshotsWithApprovedFilter =
    await api.functional.ecommerceMall.superAdmin.refund_requests.snapshots.index(
      superAdminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          action_type: "approved" as const,
          limit: 50 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: "created_at" as const,
          sort_order: "DESC" as const,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsWithApprovedFilter);
  // 5. Verify filtered results
  TestValidator.predicate(
    "snapshots returned with approved filter",
    snapshotsWithApprovedFilter.data.length >= 0,
  );
  // 6. Verify all returned snapshots have actionType="approved"
  snapshotsWithApprovedFilter.data.forEach((snapshot) => {
    TestValidator.equals(
      `snapshot ${snapshot.id} actionType is approved`,
      snapshot.actionType,
      "approved",
    );
    TestValidator.equals(
      `snapshot ${snapshot.id} actorType is seller`,
      snapshot.actorType,
      "seller",
    );
  });
  // 7. Verify pagination metadata
  typia.assert(snapshotsWithApprovedFilter.pagination);
  TestValidator.predicate(
    "pagination has valid limit",
    snapshotsWithApprovedFilter.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records",
    snapshotsWithApprovedFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    snapshotsWithApprovedFilter.pagination.pages >= 0,
  );
  // 8. Test with action_type="created" to verify filter excludes other action types
  const snapshotsWithCreatedFilter =
    await api.functional.ecommerceMall.superAdmin.refund_requests.snapshots.index(
      superAdminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          action_type: "created" as const,
          limit: 50 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: "created_at" as const,
          sort_order: "DESC" as const,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsWithCreatedFilter);
  // 9. Verify created filter works
  TestValidator.equals(
    "created filter returns at least one snapshot",
    snapshotsWithCreatedFilter.data.length,
    1,
  );
  // 10. Verify all created snapshots have actionType="created"
  snapshotsWithCreatedFilter.data.forEach((snapshot) => {
    TestValidator.equals(
      `snapshot ${snapshot.id} actionType is created`,
      snapshot.actionType,
      "created",
    );
  });
  // 11. Verify sorting by created_at DESC within filtered results
  if (snapshotsWithCreatedFilter.data.length > 1) {
    for (let i = 1; i < snapshotsWithCreatedFilter.data.length; i++) {
      const prevCreatedAt = new Date(
        snapshotsWithCreatedFilter.data[i - 1].createdAt,
      );
      const currCreatedAt = new Date(
        snapshotsWithCreatedFilter.data[i].createdAt,
      );
      TestValidator.predicate(
        `snapshot ${i} is sorted DESC by created_at`,
        currCreatedAt <= prevCreatedAt,
      );
    }
  }
}