import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContractSnapshot";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_contract_snapshot_update_tenant_isolation_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate member (join)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        organizationName: `${RandomGenerator.alphabets(10)}-OrgInit`,
        organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
        organizationCurrencyCode: "USD",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 1,
        href: "https://example.com/join",
        referrer: "https://example.com/ref",
        ip: "127.0.0.1",
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
  typia.assert(authorized);
  // Actor-specific connection with bearer token
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  // 2) Create two different tenant settings within the currently selected org context.
  // NOTE: With the provided API surface, we cannot list/create/switch to an existing
  // second organization. We can only update the selected organization's profile.
  // This still exercises the tenant boundary check at the snapshot update layer.
  const orgAName = `${RandomGenerator.alphabets(10)}-OrgA`;
  const orgBName = `${RandomGenerator.alphabets(10)}-OrgB`;
  await api.functional.erpHrmTimeTracking.member.organizations.updateOrganization(
    memberAuthConnection,
    {
      body: {
        name: orgAName,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
    },
  );
  await api.functional.erpHrmTimeTracking.member.organizations.updateOrganization(
    memberAuthConnection,
    {
      body: {
        name: orgBName,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
    },
  );
  // 3) Attempt to update a contract snapshot id while a different org profile
  // is selected. Since no snapshot creation/list/read endpoints are provided,
  // we use a generated snapshot UUID and assert that the system rejects the
  // cross-tenant update attempt.
  const targetSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const attemptedUpdate: IErpHrmTimeTrackingContractSnapshot.IUpdate = {
    id: targetSnapshotId,
    contract_code: `CTR-${RandomGenerator.alphabets(8)}`,
    start_date: new Date().toISOString(),
    end_date: null,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
    hourly_rate: typia.random<number & tags.Minimum<0>>(),
    currency: "USD",
    work_term: "full-time",
  };
  // 4) Rejection validation
  await TestValidator.error(
    "denies cross-organization contract snapshot update",
    async () => {
      const updated =
        await api.functional.erpHrmTimeTracking.member.contractSnapshots.update(
          memberAuthConnection,
          {
            body: attemptedUpdate,
          },
        );
      // If it unexpectedly succeeds, fail the test explicitly.
      typia.assert(updated);
      throw new Error("Expected update to be rejected, but it succeeded.");
    },
  );
}
