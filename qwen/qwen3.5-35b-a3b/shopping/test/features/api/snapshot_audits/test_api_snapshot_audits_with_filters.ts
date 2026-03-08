import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshotAudit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_snapshot_audits_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test filtering by record_type: product
  const productFilter: IEcommerceMallSnapshotAudit.IRequest = {
    recordType: "product",
  } satisfies IEcommerceMallSnapshotAudit.IRequest;
  const productResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      { body: productFilter },
    );
  typia.assert(productResponse);
  const products = productResponse.data;
  products.forEach((snapshot) => {
    TestValidator.equals(
      "record_type is product",
      snapshot.record_type,
      "product",
    );
  });
  // 3. Test filtering by record_type: order_item
  const orderItemFilter: IEcommerceMallSnapshotAudit.IRequest = {
    recordType: "order_item",
  } satisfies IEcommerceMallSnapshotAudit.IRequest;
  const orderItemResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      { body: orderItemFilter },
    );
  typia.assert(orderItemResponse);
  const orderItems = orderItemResponse.data;
  orderItems.forEach((snapshot) => {
    TestValidator.equals(
      "record_type is order_item",
      snapshot.record_type,
      "order_item",
    );
  });
  // 4. Test filtering by record_type: review
  const reviewFilter: IEcommerceMallSnapshotAudit.IRequest = {
    recordType: "review",
  } satisfies IEcommerceMallSnapshotAudit.IRequest;
  const reviewResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      { body: reviewFilter },
    );
  typia.assert(reviewResponse);
  const reviews = reviewResponse.data;
  reviews.forEach((snapshot) => {
    TestValidator.equals(
      "record_type is review",
      snapshot.record_type,
      "review",
    );
  });
  // 5. Test filtering by record_id (use a UUID from an existing snapshot if available)
  const recordIdValue: (string & tags.Format<"uuid">) | undefined =
    products.length > 0
      ? typia.assert<string & tags.Format<"uuid">>(products[0].record_id)
      : (RandomGenerator.alphaNumeric(36) as string & tags.Format<"uuid">);
  const recordIdFilter: IEcommerceMallSnapshotAudit.IRequest = {
    recordId: recordIdValue,
  } satisfies IEcommerceMallSnapshotAudit.IRequest;
  const recordIdResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      { body: recordIdFilter },
    );
  typia.assert(recordIdResponse);
  const recordIdResults = recordIdResponse.data;
  recordIdResults.forEach((snapshot) => {
    TestValidator.equals(
      "record_id matches filter",
      snapshot.record_id,
      recordIdFilter.recordId!,
    );
  });
  // 6. Test filtering by changed_by (use a UUID from an existing snapshot if available)
  const changedByValue: (string & tags.Format<"uuid">) | undefined =
    products.length > 0
      ? typia.assert<string & tags.Format<"uuid">>(products[0].changed_by)
      : (RandomGenerator.alphaNumeric(36) as string & tags.Format<"uuid">);
  const changedByFilter: IEcommerceMallSnapshotAudit.IRequest = {
    changedBy: changedByValue,
  } satisfies IEcommerceMallSnapshotAudit.IRequest;
  const changedByResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      { body: changedByFilter },
    );
  typia.assert(changedByResponse);
  const changedByResults = changedByResponse.data;
  changedByResults.forEach((snapshot) => {
    TestValidator.equals(
      "changed_by matches filter",
      snapshot.changed_by,
      changedByFilter.changedBy!,
    );
  });
  // 7. Test date range filtering with minChangedAt
  const minChangedAtFilter: IEcommerceMallSnapshotAudit.IRequest = {
    minChangedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  } satisfies IEcommerceMallSnapshotAudit.IRequest;
  const minChangedAtResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      { body: minChangedAtFilter },
    );
  typia.assert(minChangedAtResponse);
  // 8. Test date range filtering with maxChangedAt
  const maxChangedAtFilter: IEcommerceMallSnapshotAudit.IRequest = {
    maxChangedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  } satisfies IEcommerceMallSnapshotAudit.IRequest;
  const maxChangedAtResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      { body: maxChangedAtFilter },
    );
  typia.assert(maxChangedAtResponse);
  // 9. Test combined date range filtering
  const dateRangeFilter: IEcommerceMallSnapshotAudit.IRequest = {
    minChangedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    maxChangedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  } satisfies IEcommerceMallSnapshotAudit.IRequest;
  const dateRangeResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      { body: dateRangeFilter },
    );
  typia.assert(dateRangeResponse);
  // 10. Test combination of multiple filters
  const combinedFilter: IEcommerceMallSnapshotAudit.IRequest = {
    recordType: "product",
    minChangedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    limit: 50,
    page: 1,
  } satisfies IEcommerceMallSnapshotAudit.IRequest;
  const combinedResponse =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResponse);
  const combinedResults = combinedResponse.data;
  combinedResults.forEach((snapshot) => {
    TestValidator.equals(
      "record_type matches combined filter",
      snapshot.record_type,
      "product",
    );
  });
  // 11. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    combinedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    combinedResponse.pagination.limit >= 1 &&
      combinedResponse.pagination.limit <= 200,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    combinedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    combinedResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages matches records and limit",
    combinedResponse.pagination.pages ===
      Math.ceil(
        combinedResponse.pagination.records / combinedResponse.pagination.limit,
      ) ||
      (combinedResponse.pagination.records === 0 &&
        combinedResponse.pagination.pages === 0),
  );
}
