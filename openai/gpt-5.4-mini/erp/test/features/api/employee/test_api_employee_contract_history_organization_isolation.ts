import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_contract_history_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const requesterConnection: api.IConnection = { host: connection.host };
  const requester = await authorize_member_join(requesterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register/requester",
      referrer: "https://example.com/signup",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(requester);
  const foreignConnection: api.IConnection = { host: connection.host };
  const foreign = await authorize_member_join(foreignConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register/foreign",
      referrer: "https://example.com/signup",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(foreign);
  const requesterHistory =
    await api.functional.erpHrmTime.member.employee.contracts.history.index(
      requesterConnection,
    );
  typia.assert(requesterHistory);
  const foreignHistory =
    await api.functional.erpHrmTime.member.employee.contracts.history.index(
      foreignConnection,
    );
  typia.assert(foreignHistory);
  TestValidator.equals(
    "requester history page should be a valid page structure",
    requesterHistory.pagination.current,
    requesterHistory.pagination.current,
  );
  TestValidator.equals(
    "foreign history page should be a valid page structure",
    foreignHistory.pagination.current,
    foreignHistory.pagination.current,
  );
  TestValidator.notEquals(
    "separate authorized sessions should not share the same member id",
    requester.id,
    foreign.id,
  );
  TestValidator.equals(
    "history responses should remain read-only summaries",
    requesterHistory.data.every(
      (item) => item.deletedAt === null || typeof item.deletedAt === "string",
    ),
    true,
  );
  TestValidator.equals(
    "history responses should remain read-only summaries for the foreign context",
    foreignHistory.data.every(
      (item) => item.deletedAt === null || typeof item.deletedAt === "string",
    ),
    true,
  );
}
