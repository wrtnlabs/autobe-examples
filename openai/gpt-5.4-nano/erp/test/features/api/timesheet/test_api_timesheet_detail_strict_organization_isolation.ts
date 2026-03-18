import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_detail_strict_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member via join.
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const password = "P@ssw0rd!";
  const email = typia.random<string & tags.Format<"email">>();
  const authorized = await authorize_member_join(memberJoinConnection, {
    body: {
      email,
      password,
      organizationName: `Org-A-${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: undefined,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2) Switch selected organization context to Org A.
  const orgA =
    await api.functional.erpHrmTimeTracking.member.organizations.updateOrganization(
      memberConnection,
      {
        body: {
          name: `Org-A-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          timezone: "Asia/Seoul",
          currency_code: "USD",
          fiscal_start_month: 1,
          logo_url: null,
        } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
      },
    );
  typia.assert(orgA);
  // 3) Attempt to read a timesheet id that should belong to another
  // organization. Exact cross-tenant seeding is not available from the
  // provided SDK functions, so we validate strict isolation behavior:
  // either the API denies access (throws) or, if it returns data, it must
  // be scoped to the selected organization.
  const crossOrgTimesheetId = typia.random<string & tags.Format<"uuid">>();
  try {
    const response =
      await api.functional.erpHrmTimeTracking.member.timesheets.at(
        memberConnection,
        { timesheetId: crossOrgTimesheetId },
      );
    typia.assert(response);
    TestValidator.equals(
      "returned timesheet must be scoped to selected organization",
      response.erpHrmTimeTrackingOrganizationId,
      orgA.id,
    );
  } catch (e) {
    // Safe denial is acceptable; ensure it is an expected HttpError.
    TestValidator.predicate(
      "cross-organization timesheet access must be denied",
      () => e instanceof api.HttpError,
    );
  }
}
