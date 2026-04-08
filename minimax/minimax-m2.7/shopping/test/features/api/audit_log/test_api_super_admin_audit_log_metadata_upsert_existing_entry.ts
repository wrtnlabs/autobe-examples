import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminAuditLogMetadatum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_audit_log_metadata_upsert_existing_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate logId for the audit log
  const logId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create initial metadata entry with key 'previous_state' = 'pending'
  const initialBody: IEcommerceMallSuperAdminAuditLogMetadatum.IRequest = {
    previous_state: "pending",
  };
  const firstResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.metadata.upsert(
      superAdminConnection,
      {
        logId,
        body: initialBody,
      },
    );
  typia.assert(firstResponse);
  // Verify initial state: one entry with 'pending' value
  TestValidator.equals(
    "initial metadata count is 1",
    firstResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "initial value is 'pending'",
    firstResponse.data[0]?.value,
    "pending",
  );
  TestValidator.equals(
    "initial key is 'previous_state'",
    firstResponse.data[0]?.key,
    "previous_state",
  );
  // 4. Upsert the same key with new value 'approved'
  const updatedBody: IEcommerceMallSuperAdminAuditLogMetadatum.IRequest = {
    previous_state: "approved",
  };
  const secondResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.metadata.upsert(
      superAdminConnection,
      {
        logId,
        body: updatedBody,
      },
    );
  typia.assert(secondResponse);
  // 5. Verify the value was updated to 'approved'
  const updatedEntry = secondResponse.data.find(
    (m) => m.key === "previous_state",
  );
  TestValidator.equals(
    "updated value is 'approved'",
    updatedEntry?.value,
    "approved",
  );
  // 6. Verify upsert behavior: no new entry was created
  TestValidator.equals(
    "count unchanged after upsert (upsert behavior)",
    secondResponse.pagination.records,
    1,
  );
}
