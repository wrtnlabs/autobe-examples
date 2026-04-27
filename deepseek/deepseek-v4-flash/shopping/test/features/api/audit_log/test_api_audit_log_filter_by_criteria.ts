import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministratorAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSuperAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSuperAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_audit_log_filter_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Join as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(authorized);
  // Test 1: Filter by action type
  const byAction =
    await api.functional.eCommerceMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          action: "seller_suspension",
        } satisfies IECommerceMallSuperAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(byAction);
  for (const entry of byAction.data) {
    TestValidator.equals("action filter", entry.action, "seller_suspension");
  }
  // Test 2: Filter by target entity type
  const byTargetType =
    await api.functional.eCommerceMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          targetType: "seller",
        } satisfies IECommerceMallSuperAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(byTargetType);
  for (const entry of byTargetType.data) {
    TestValidator.equals("target type filter", entry.target_type, "seller");
  }
  // Test 3: Filter by actorType = 'administrator'
  const byActorAdmin =
    await api.functional.eCommerceMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          actorType: "administrator",
        } satisfies IECommerceMallSuperAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(byActorAdmin);
  for (const entry of byActorAdmin.data) {
    TestValidator.equals(
      "actor type administrator",
      entry.actor_type,
      "administrator",
    );
  }
  // Test 4: Filter by actorType = 'superAdministrator'
  const byActorSuper =
    await api.functional.eCommerceMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          actorType: "superAdministrator",
        } satisfies IECommerceMallSuperAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(byActorSuper);
  for (const entry of byActorSuper.data) {
    TestValidator.equals(
      "actor type superAdministrator",
      entry.actor_type,
      "superAdministrator",
    );
  }
  // Test 5: Filter by actorType = 'both'
  const byActorBoth =
    await api.functional.eCommerceMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          actorType: "both",
        } satisfies IECommerceMallSuperAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(byActorBoth);
  // Test 6: Date range filter (valid range)
  const byDateRange =
    await api.functional.eCommerceMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          from: "2024-01-01T00:00:00.000Z",
          to: "2026-12-31T23:59:59.999Z",
        } satisfies IECommerceMallSuperAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(byDateRange);
  const fromTime = new Date("2024-01-01T00:00:00.000Z").getTime();
  const toTime = new Date("2026-12-31T23:59:59.999Z").getTime();
  for (const entry of byDateRange.data) {
    const createdAt = new Date(entry.created_at).getTime();
    TestValidator.predicate(
      "entry within date range",
      () => createdAt >= fromTime && createdAt <= toTime,
    );
  }
  // Test 7: Future date filter — expect empty results
  const futureResult =
    await api.functional.eCommerceMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          from: "2099-01-01T00:00:00.000Z",
        } satisfies IECommerceMallSuperAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(futureResult);
  TestValidator.equals(
    "future date returns empty",
    futureResult.data.length,
    0,
  );
}
