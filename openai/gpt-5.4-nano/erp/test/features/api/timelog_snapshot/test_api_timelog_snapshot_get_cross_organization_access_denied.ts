import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { generate_random_erp_hrm_time_tracking_member_timelog_snapshots_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelog_snapshots_create";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";
import { prepare_random_erp_hrm_time_tracking_timelog_snapshot } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog_snapshot";

export async function test_api_timelog_snapshot_get_cross_organization_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password!1234";
  const joinBody = {
    email,
    password,
    organizationName: `org-${RandomGenerator.alphabets(10)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: `https://example.com/${RandomGenerator.alphabets(8)}`,
    referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
    organizationLogoUrl: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  const orgAName = joinBody.organizationName;
  // 2) Create org B
  const orgB =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        },
      },
    );
  typia.assert(orgB);
  // 3) Switch to org B context
  await api.functional.erpHrmTimeTracking.member.organizations.updateOrganization(
    memberConnection,
    {
      body: {
        name: orgB.name,
      } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
    },
  );
  // 4) Create timelog snapshot in org B
  const snapshotInB =
    await generate_random_erp_hrm_time_tracking_member_timelog_snapshots_create(
      memberConnection,
      {},
    );
  typia.assert(snapshotInB);
  // 5) Switch back to org A context
  await api.functional.erpHrmTimeTracking.member.organizations.updateOrganization(
    memberConnection,
    {
      body: {
        name: orgAName,
      } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
    },
  );
  // 6) Access attempt from org A
  await TestValidator.httpError(
    "cross-organization snapshot access should be denied",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTimeTracking.member.timelogSnapshots.at(
        memberConnection,
        {
          timelogSnapshotId: snapshotInB.id,
        },
      );
    },
  );
}
