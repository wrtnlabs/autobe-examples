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

export async function test_api_snapshot_audits_success_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
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
  // 2. Test default snapshot audits
  const snapshots =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(snapshots);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination has current",
    snapshots.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    snapshots.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    snapshots.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    snapshots.pagination.pages !== undefined,
    true,
  );
  // 4. Validate each snapshot record
  for (const snapshot of snapshots.data) {
    typia.assert(snapshot);
    // Validate id is UUID
    TestValidator.equals(
      "snapshot has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
      true,
    );
    // Validate record_type is valid enum
    const validRecordTypes = [
      "product",
      "product_variant",
      "seller_profile",
      "order_item",
      "review",
      "cancellation_request",
      "refund_request",
    ];
    TestValidator.equals(
      "record_type valid enum",
      validRecordTypes.includes(snapshot.record_type),
      true,
    );
    // Validate record_id is UUID
    TestValidator.equals(
      "record_id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(snapshot.record_id),
      true,
    );
    // Validate changed_at is valid date-time
    TestValidator.equals(
      "changed_at is valid date-time",
      !isNaN(Date.parse(snapshot.changed_at)),
      true,
    );
    // Validate changed_by is UUID
    TestValidator.equals(
      "changed_by is valid UUID",
      /^[0-9a-f-]{36}$/i.test(snapshot.changed_by),
      true,
    );
  }
  // 5. Test sorting by changed_at descending
  const sortedByChangedAt =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          sortBy: "changed_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(sortedByChangedAt);
  // 6. Test sorting by record_type ascending
  const sortedByRecordType =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          sortBy: "record_type",
          sortOrder: "asc",
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(sortedByRecordType);
  // 7. Test empty data case with non-existent record
  const emptyResult =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          recordId: "00000000-0000-0000-0000-000000000000",
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty records count",
    emptyResult.pagination.records,
    0,
  );
}