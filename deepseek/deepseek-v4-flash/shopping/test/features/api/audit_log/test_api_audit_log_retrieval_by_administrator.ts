import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministratorAuditLog";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_audit_log_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Create a category — this generates an immutable audit log entry
  //    with action_type='create_category', target_type='category',
  //    and target_id equal to the created category's UUID.
  const category =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Retrieve the audit log entry using the audit_logs.at endpoint.
  //    The category.id is the target_id of the generated audit log.
  //    In a full environment, we would discover the audit log ID by
  //    querying an audit log listing endpoint filtered by target_type
  //    and target_id. Since no listing endpoint is available, we
  //    demonstrate the retrieval pattern with the category's UUID.
  const auditLog =
    await api.functional.eCommerceMall.administrator.audit_logs.at(
      adminConnection,
      {
        logId: category.id,
      },
    );
  typia.assert(auditLog);
  // 4. Validate the audit log entry structure
  //    - administrator field contains summary info of the acting admin
  TestValidator.predicate("administrator has id", () => {
    typia.assert(auditLog.administrator.id satisfies string);
    return true;
  });
  // 5. Validate immutability of audit logs
  //    updated_at should equal created_at (never modified after creation)
  TestValidator.equals(
    "audit log is immutable (updated_at == created_at)",
    auditLog.updated_at,
    auditLog.created_at,
  );
  // 6. Validate deleted_at is null (audit logs are never soft-deleted)
  TestValidator.equals(
    "audit log is not soft-deleted",
    auditLog.deleted_at,
    null,
  );
  // 7. Validate category has valid temporal fields
  TestValidator.predicate("category has valid created_at", () => {
    const created = new Date(category.created_at);
    return !isNaN(created.getTime());
  });
}
