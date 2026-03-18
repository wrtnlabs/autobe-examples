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

export async function test_api_contract_snapshot_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join to get authenticated context
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>() satisfies string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
    organizationName: RandomGenerator.name(2),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // This test requires an existing contract snapshot id.
  // No contract snapshot read/list utilities/endpoints are provided,
  // so we can only execute the update workflow reliably in simulation mode.
  if (connection.simulate !== true && memberConnection.simulate !== true) {
    TestValidator.predicate(
      "simulation mode required (no snapshot read/list endpoint available)",
      false,
    );
    return;
  }
  // 2) Prepare an existing contract snapshot (simulation generated)
  const original: IErpHrmTimeTrackingContractSnapshot =
    typia.random<IErpHrmTimeTrackingContractSnapshot>();
  typia.assert(original);
  const originalCreatedAt = original.created_at;
  const originalUpdatedAt = original.updated_at;
  // 3) Update snapshot
  const startDate1 = RandomGenerator.date(new Date(), 1000 * 60 * 60);
  const startDate2 = RandomGenerator.date(new Date(), 1000 * 60 * 60);
  const updateInput = {
    id: original.id,
    contract_code: `CTR-${RandomGenerator.alphabets(8)}`,
    start_date: startDate1.toISOString(),
    end_date: null,
    notes: null,
    hourly_rate: typia.random<number>() satisfies number,
    currency: "USD",
    work_term: RandomGenerator.pick([
      "full-time",
      "part-time",
      "contract",
    ] as const),
  } satisfies IErpHrmTimeTrackingContractSnapshot.IUpdate;
  const updated =
    await api.functional.erpHrmTimeTracking.member.contractSnapshots.update(
      memberConnection,
      {
        body: updateInput,
      },
    );
  typia.assert(updated);
  // 4) Validate persisted changes
  TestValidator.equals("contract snapshot id", updated.id, original.id);
  TestValidator.equals(
    "organization scope preserved",
    updated.organization_id,
    original.organization_id,
  );
  TestValidator.equals(
    "contract_code updated",
    updated.contract_code,
    updateInput.contract_code,
  );
  TestValidator.equals(
    "start_date updated",
    updated.start_date,
    updateInput.start_date,
  );
  TestValidator.equals("end_date cleared", updated.end_date, null);
  TestValidator.equals("notes cleared", updated.notes, null);
  TestValidator.equals(
    "hourly_rate updated",
    updated.hourly_rate,
    updateInput.hourly_rate,
  );
  TestValidator.equals(
    "currency updated",
    updated.currency,
    updateInput.currency,
  );
  TestValidator.equals(
    "work_term updated",
    updated.work_term,
    updateInput.work_term,
  );
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    originalUpdatedAt,
  );
  // Optional: do a second update to ensure null handling works again
  const updateInput2 = {
    id: updated.id,
    contract_code: `CTR-${RandomGenerator.alphabets(10)}`,
    start_date: startDate2.toISOString(),
    end_date: null,
    notes: null,
  } satisfies IErpHrmTimeTrackingContractSnapshot.IUpdate;
  const updated2 =
    await api.functional.erpHrmTimeTracking.member.contractSnapshots.update(
      memberConnection,
      {
        body: updateInput2,
      },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "id stable after second update",
    updated2.id,
    updated.id,
  );
  TestValidator.equals(
    "created_at stable after second update",
    updated2.created_at,
    originalCreatedAt,
  );
  TestValidator.equals("end_date still null", updated2.end_date, null);
  TestValidator.equals("notes still null", updated2.notes, null);
  TestValidator.equals(
    "contract_code changed",
    updated2.contract_code,
    updateInput2.contract_code,
  );
  TestValidator.equals(
    "start_date changed",
    updated2.start_date,
    updateInput2.start_date,
  );
  TestValidator.notEquals(
    "updated_at changed after second update",
    updated2.updated_at,
    updated.updated_at,
  );
}
