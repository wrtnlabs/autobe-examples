import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_snapshot_audits_admin_filtering_by_entity_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Test filtering by single record_type: 'product'
  const productFilter =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          record_type: ["product"],
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(productFilter);
  productFilter.data.forEach((snapshot) => {
    TestValidator.equals(
      "product filter returns only product type",
      snapshot.record_type,
      "product",
    );
  });
  // 3. Test filtering by single record_type: 'product_variant'
  const variantFilter =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          record_type: ["product_variant"],
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(variantFilter);
  variantFilter.data.forEach((snapshot) => {
    TestValidator.equals(
      "product_variant filter returns only product_variant type",
      snapshot.record_type,
      "product_variant",
    );
  });
  // 4. Test filtering by multiple record_types
  const multiFilter =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          record_type: ["product", "product_variant"],
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(multiFilter);
  multiFilter.data.forEach((snapshot) => {
    TestValidator.predicate(
      "multi filter returns only product or product_variant",
      snapshot.record_type === "product" ||
        snapshot.record_type === "product_variant",
    );
  });
  // 5. Test filtering by single record_type: 'order_item'
  const orderItemFilter =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          record_type: ["order_item"],
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(orderItemFilter);
  orderItemFilter.data.forEach((snapshot) => {
    TestValidator.equals(
      "order_item filter returns only order_item type",
      snapshot.record_type,
      "order_item",
    );
  });
  // 6. Test filtering by single record_type: 'review'
  const reviewFilter =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          record_type: ["review"],
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(reviewFilter);
  reviewFilter.data.forEach((snapshot) => {
    TestValidator.equals(
      "review filter returns only review type",
      snapshot.record_type,
      "review",
    );
  });
  // 7. Test empty record_type filter (returns all types)
  const emptyFilter =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          record_type: [],
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(emptyFilter);
  // 8. Test omitted record_type filter (returns all types)
  const omittedFilter =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(omittedFilter);
  // 9. Validate record_type enum values in all filter responses
  const allValidTypes = [
    "product",
    "product_variant",
    "seller_profile",
    "order_item",
    "review",
    "cancellation_request",
    "refund_request",
  ];
  const allSnapshots = [
    ...productFilter.data,
    ...variantFilter.data,
    ...multiFilter.data,
    ...orderItemFilter.data,
    ...reviewFilter.data,
    ...emptyFilter.data,
    ...omittedFilter.data,
  ];
  allSnapshots.forEach((snapshot) => {
    TestValidator.predicate(
      "record_type is in allowed values",
      allValidTypes.includes(snapshot.record_type),
    );
  });
  // 10. Validate changed_by field exists and has correct structure
  allSnapshots.forEach((snapshot) => {
    TestValidator.predicate(
      "changed_by is not null or undefined",
      snapshot.changed_by !== null && snapshot.changed_by !== undefined,
    );
    // Check that changed_by has id field (common across admin, seller, customer)
    const changedBy = snapshot.changed_by;
    TestValidator.predicate(
      "changed_by has id",
      "id" in changedBy && changedBy.id !== undefined,
    );
  });
  // 11. Validate pagination info is correct
  TestValidator.predicate(
    "productFilter has pagination",
    productFilter.pagination !== undefined,
  );
  TestValidator.predicate(
    "multiFilter has pagination",
    multiFilter.pagination !== undefined,
  );
  TestValidator.predicate(
    "orderItemFilter has pagination",
    orderItemFilter.pagination !== undefined,
  );
  TestValidator.predicate(
    "reviewFilter has pagination",
    reviewFilter.pagination !== undefined,
  );
  TestValidator.predicate(
    "emptyFilter has pagination",
    emptyFilter.pagination !== undefined,
  );
  TestValidator.predicate(
    "omittedFilter has pagination",
    omittedFilter.pagination !== undefined,
  );
  // 12. Validate pagination limit is respected
  TestValidator.predicate(
    "productFilter limit respected",
    productFilter.data.length <= 100,
  );
  TestValidator.predicate(
    "multiFilter limit respected",
    multiFilter.data.length <= 100,
  );
  TestValidator.predicate(
    "orderItemFilter limit respected",
    orderItemFilter.data.length <= 100,
  );
  TestValidator.predicate(
    "reviewFilter limit respected",
    reviewFilter.data.length <= 100,
  );
  TestValidator.predicate(
    "emptyFilter limit respected",
    emptyFilter.data.length <= 100,
  );
  TestValidator.predicate(
    "omittedFilter limit respected",
    omittedFilter.data.length <= 100,
  );
}
