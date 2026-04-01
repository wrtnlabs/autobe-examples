import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import type { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import type { IErpHrmTimeTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_update_access_and_state_restrictions(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const colleagueConnection: api.IConnection = { host: connection.host };
  const colleague = await authorize_member_join(colleagueConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(colleague);
  const otherOrganizationConnection: api.IConnection = {
    host: connection.host,
  };
  const otherOrganizationMember = await authorize_member_join(
    otherOrganizationConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        name: RandomGenerator.name(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(otherOrganizationMember);
  await TestValidator.error(
    "foreign timesheet update should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.update(
        colleagueConnection,
        {
          timesheetId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IErpHrmTimeTimesheet.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "cross-organization timesheet update should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.update(
        ownerConnection,
        {
          timesheetId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IErpHrmTimeTimesheet.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "non-editable timesheet update should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.update(
        otherOrganizationConnection,
        {
          timesheetId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            approvalStatus: "approved",
          } satisfies IErpHrmTimeTimesheet.IUpdate,
        },
      );
    },
  );
}
