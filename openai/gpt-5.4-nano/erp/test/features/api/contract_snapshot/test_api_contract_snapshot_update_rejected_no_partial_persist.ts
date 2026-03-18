import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContractSnapshot";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_contract_snapshot_update_rejected_no_partial_persist(
  connection: api.IConnection,
): Promise<void> {
  const memberBase: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberBase, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://${RandomGenerator.alphabets(8)}.example.com/join`,
      referrer: `https://${RandomGenerator.alphabets(8)}.example.com/ref`,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuthorized.token.access };
  // Baseline: attempt to load the snapshot by calling update with only id.
  // If the system requires an actual update payload, this will fail and surface the missing read API.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const before =
    await api.functional.erpHrmTimeTracking.member.contractSnapshots.update(
      memberConnection,
      {
        body: {
          id: snapshotId,
        } satisfies IErpHrmTimeTrackingContractSnapshot.IUpdate,
      },
    );
  typia.assert(before);
  const start = new Date().toISOString();
  const endEarlier = new Date(Date.now() - 60000).toISOString();
  const invalidUpdate = {
    id: before.id,
    start_date: start as string & tags.Format<"date-time">,
    end_date: endEarlier as string & tags.Format<"date-time"> as
      | (string & tags.Format<"date-time">)
      | null,
    hourly_rate: -1,
  } satisfies IErpHrmTimeTrackingContractSnapshot.IUpdate;
  await TestValidator.error(
    "contract snapshot update should be rejected and not persist partial changes",
    async () => {
      await api.functional.erpHrmTimeTracking.member.contractSnapshots.update(
        memberConnection,
        { body: invalidUpdate },
      );
    },
  );
  // Re-fetch: call update again with only id and verify immutability.
  const after =
    await api.functional.erpHrmTimeTracking.member.contractSnapshots.update(
      memberConnection,
      {
        body: {
          id: before.id,
        } satisfies IErpHrmTimeTrackingContractSnapshot.IUpdate,
      },
    );
  typia.assert(after);
  TestValidator.equals("snapshot unchanged: id", after.id, before.id);
  TestValidator.equals(
    "snapshot unchanged: erp contract id",
    after.erp_hrm_time_tracking_contract_id,
    before.erp_hrm_time_tracking_contract_id,
  );
  TestValidator.equals(
    "snapshot unchanged: employee id",
    after.employee_id,
    before.employee_id,
  );
  TestValidator.equals(
    "snapshot unchanged: organization id",
    after.organization_id,
    before.organization_id,
  );
  TestValidator.equals(
    "snapshot unchanged: contract_code",
    after.contract_code,
    before.contract_code,
  );
  TestValidator.equals(
    "snapshot unchanged: start_date",
    after.start_date,
    before.start_date,
  );
  TestValidator.equals(
    "snapshot unchanged: end_date",
    after.end_date,
    before.end_date,
  );
  TestValidator.equals("snapshot unchanged: notes", after.notes, before.notes);
  TestValidator.equals(
    "snapshot unchanged: hourly_rate",
    after.hourly_rate,
    before.hourly_rate,
  );
  TestValidator.equals(
    "snapshot unchanged: currency",
    after.currency,
    before.currency,
  );
  TestValidator.equals(
    "snapshot unchanged: work_term",
    after.work_term,
    before.work_term,
  );
  TestValidator.equals(
    "snapshot unchanged: created_at",
    after.created_at,
    before.created_at,
  );
  TestValidator.equals(
    "snapshot unchanged: updated_at",
    after.updated_at,
    before.updated_at,
  );
}
