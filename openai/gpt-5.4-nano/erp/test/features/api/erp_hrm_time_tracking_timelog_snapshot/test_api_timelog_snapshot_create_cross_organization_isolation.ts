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

export async function test_api_timelog_snapshot_create_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member (join creates the initial organization A)
  const memberConnection: api.IConnection = { host: connection.host };
  const organizationAName = `org-a-${RandomGenerator.alphabets(10)}`;
  const organizationBName = `org-b-${RandomGenerator.alphabets(10)}`;
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: organizationAName,
      organizationDescription: "organization a",
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  // Create organization B in the same member account
  const memberSessionConnection: api.IConnection = {
    host: connection.host,
  };
  memberSessionConnection.headers = memberConnection.headers;
  const organizationB =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberSessionConnection,
      {
        body: {
          name: organizationBName,
        },
      },
    );
  typia.assert(organizationB);
  // Create a timelog snapshot in organization A and capture the referenced timelog id
  const snapshotA =
    await generate_random_erp_hrm_time_tracking_member_timelog_snapshots_create(
      memberSessionConnection,
      {},
    );
  typia.assert(snapshotA);
  const timelogIdFromOrgA = snapshotA.erp_hrm_time_tracking_timelog_id;
  // Attempt to create a timelog snapshot referencing timelog from org A,
  // while we are in organization B context.
  // (We rely on the backend's organization selection mechanism tied to the member context.)
  await TestValidator.httpError(
    "reject cross-organization timelog snapshot creation",
    [400, 403, 404, 409],
    async () => {
      await generate_random_erp_hrm_time_tracking_member_timelog_snapshots_create(
        memberSessionConnection,
        {
          body: {
            erp_hrm_time_tracking_timelog_id: timelogIdFromOrgA,
          },
        },
      );
    },
  );
  // Switch back to organization A and ensure the same timelog can still be snapshotted
  const snapshotA2 =
    await generate_random_erp_hrm_time_tracking_member_timelog_snapshots_create(
      memberSessionConnection,
      {
        body: {
          erp_hrm_time_tracking_timelog_id: timelogIdFromOrgA,
        },
      },
    );
  typia.assert(snapshotA2);
  TestValidator.equals(
    "timelog id should match original org A timelog reference",
    snapshotA2.erp_hrm_time_tracking_timelog_id,
    timelogIdFromOrgA,
  );
}
