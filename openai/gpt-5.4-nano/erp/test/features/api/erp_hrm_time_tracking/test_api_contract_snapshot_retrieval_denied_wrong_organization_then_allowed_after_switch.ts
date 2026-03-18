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

export async function test_api_contract_snapshot_retrieval_denied_wrong_organization_then_allowed_after_switch(
  connection: api.IConnection,
): Promise<void> {
  // Create member context for organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const joinInputA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!" + RandomGenerator.alphabets(10),
    organizationName: `org-a-${RandomGenerator.alphabets(10)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: `https://example.com/href/${RandomGenerator.alphabets(12)}`,
    referrer: `https://example.com/ref/${RandomGenerator.alphabets(12)}`,
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberAConnection, { body: joinInputA }).then(
    (output) => typia.assert(output),
  );
  // Create member context for organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const joinInputB = {
    ...joinInputA,
    email: typia.random<string & tags.Format<"email">>(),
    organizationName: `org-b-${RandomGenerator.alphabets(10)}`,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberBConnection, { body: joinInputB }).then(
    (output) => typia.assert(output),
  );
  // NOTE: No endpoint for creating/listing contract snapshots is provided.
  // Therefore we cannot reliably obtain a real snapshotId belonging to org B.
  // We attempt retrieval with a random UUID; if it doesn't exist, we fail explicitly.
  const contractSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // First, org B should succeed (or we cannot validate scoping)
  const snapshotInB = await (async () => {
    try {
      const snapshot =
        await api.functional.erpHrmTimeTracking.member.contractSnapshots.at(
          memberBConnection,
          { contractSnapshotId },
        );
      typia.assert(snapshot);
      return snapshot;
    } catch {
      throw new Error(
        "Unable to obtain an existing contractSnapshotId for organization B (missing test fixture/supporting endpoints).",
      );
    }
  })();
  TestValidator.equals(
    "org B snapshot organization_id exists and is scoped",
    typeof snapshotInB.organization_id === "string",
    true,
  );
  // Then, org A should be denied for the same snapshotId
  await TestValidator.error(
    "contract snapshot retrieval denied for wrong organization",
    async () => {
      const output =
        await api.functional.erpHrmTimeTracking.member.contractSnapshots.at(
          memberAConnection,
          { contractSnapshotId },
        );
      typia.assert(output);
    },
  );
  // Finally, when using org B context, retrieval should succeed again
  const snapshotInBAgain =
    await api.functional.erpHrmTimeTracking.member.contractSnapshots.at(
      memberBConnection,
      { contractSnapshotId },
    );
  typia.assert(snapshotInBAgain);
  TestValidator.equals(
    "organization_id remains scoped to organization B",
    snapshotInBAgain.organization_id,
    snapshotInB.organization_id,
  );
}
