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

export async function test_api_contract_snapshot_retrieval_same_organization(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: RandomGenerator.pick([
        "USD",
        "EUR",
        "KRW",
        "JPY",
        "GBP",
      ] as const),
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: randint(1, 12 satisfies number) as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>,
      href: `https://${RandomGenerator.alphabets(10)}.example.com/${RandomGenerator.alphabets(8)}` satisfies string,
      referrer:
        `https://${RandomGenerator.alphabets(10)}.example.com/${RandomGenerator.alphabets(8)}` satisfies string,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const contractSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot1 =
    await api.functional.erpHrmTimeTracking.member.contractSnapshots.at(
      memberConnection,
      {
        contractSnapshotId,
      },
    );
  typia.assert<IErpHrmTimeTrackingContractSnapshot>(snapshot1);
  const snapshot2 =
    await api.functional.erpHrmTimeTracking.member.contractSnapshots.at(
      memberConnection,
      {
        contractSnapshotId,
      },
    );
  typia.assert<IErpHrmTimeTrackingContractSnapshot>(snapshot2);
  TestValidator.equals(
    "snapshot is stable across repeated reads",
    snapshot2,
    snapshot1,
  );
}
