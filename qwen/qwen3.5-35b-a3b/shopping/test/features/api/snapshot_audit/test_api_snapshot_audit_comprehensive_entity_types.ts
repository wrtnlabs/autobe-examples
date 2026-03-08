import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_snapshot_audit_comprehensive_entity_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system
  const adminAuthorized = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Create admin connection for API calls
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 3. Retrieve snapshot audits for each entity type
  const entityTypes: Array<
    | "product"
    | "product_variant"
    | "seller_profile"
    | "order_item"
    | "review"
    | "cancellation_request"
    | "refund_request"
  > = [
    "product",
    "product_variant",
    "seller_profile",
    "order_item",
    "review",
    "cancellation_request",
    "refund_request",
  ];
  for (const recordType of entityTypes) {
    // Retrieve snapshot audit for this entity type
    const audit = await api.functional.ecommerceMall.admin.snapshot_audits.at(
      adminConnection,
      {
        auditId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
    typia.assert(audit);
    // 4. Validate audit structure
    TestValidator.equals(
      `${recordType} record type`,
      audit.recordType,
      recordType,
    );
    TestValidator.predicate(
      `${recordType} has valid audit ID`,
      /^[0-9a-f-]{36}$/i.test(audit.id),
    );
    TestValidator.predicate(
      `${recordType} has valid record ID`,
      /^[0-9a-f-]{36}$/i.test(audit.recordId),
    );
    TestValidator.predicate(
      `${recordType} changes is object`,
      audit.changes !== null && typeof audit.changes === "object",
    );
    TestValidator.predicate(
      `${recordType} oldValues is object`,
      audit.oldValues !== null && typeof audit.oldValues === "object",
    );
    TestValidator.predicate(
      `${recordType} newValues is object`,
      audit.newValues !== null && typeof audit.newValues === "object",
    );
    TestValidator.predicate(
      `${recordType} changedAt timestamp format`,
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T| )(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,9})?(Z|[+-](0[0-9]|1[0-9]|2[0-3]):[0-5][0-9])$/.test(
        audit.changedAt,
      ),
    );
    TestValidator.predicate(
      `${recordType} changedBy is UUID`,
      /^[0-9a-f-]{36}$/i.test(audit.changedBy),
    );
    TestValidator.predicate(
      `${recordType} createdAt timestamp`,
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T| )(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,9})?(Z|[+-](0[0-9]|1[0-9]|2[0-3]):[0-5][0-9])$/.test(
        audit.createdAt,
      ),
    );
    TestValidator.predicate(
      `${recordType} updatedAt timestamp`,
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T| )(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,9})?(Z|[+-](0[0-9]|1[0-9]|2[0-3]):[0-5][0-9])$/.test(
        audit.updatedAt,
      ),
    );
  }
}
