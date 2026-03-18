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

export async function test_api_contract_snapshot_retrieval_not_found_or_invisible(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member (join) to obtain an authorized session.
  const memberConnection: api.IConnection = { host: connection.host };
  const uniqueEmail =
    `${RandomGenerator.alphaNumeric(10)}_${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string &
      tags.Format<"email">;
  const joinPayload = {
    email: uniqueEmail,
    password: `StrongPassword!1234_${Date.now()}`,
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinPayload,
  });
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers ??= {};
  authConnection.headers.Authorization = authorized.token.access;
  typia.assert(authorized);
  // Helper: ensure the snapshot is not returned for missing/hidden IDs.
  const assertNotReturned = async (contractSnapshotId: string) => {
    await TestValidator.error(
      "contract snapshot should be not found / not visible",
      async () => {
        const response =
          await api.functional.erpHrmTimeTracking.member.contractSnapshots.at(
            authConnection,
            { contractSnapshotId },
          );
        // If a payload is returned, it violates the "not visible/not found" expectation.
        throw new Error(
          `Unexpected contract snapshot payload returned for id=${contractSnapshotId}`,
        );
        // Note: unreachable typia.assert(response) intentionally omitted.
      },
    );
    // Side-effect check (best-effort with available APIs): subsequent retrieval attempt should also fail.
    await TestValidator.error(
      "contract snapshot should remain not found / not visible (no side effects)",
      async () => {
        await api.functional.erpHrmTimeTracking.member.contractSnapshots.at(
          authConnection,
          { contractSnapshotId },
        );
        throw new Error(
          `Unexpected contract snapshot payload returned on retry for id=${contractSnapshotId}`,
        );
      },
    );
  };
  // 2) Pick a contractSnapshotId syntactically valid but non-existent.
  const missingContractSnapshotId = typia.random<
    string & tags.Format<"uuid">
  >();
  await assertNotReturned(missingContractSnapshotId);
  // 6) Soft-deleted/invisibility case (best-effort): attempt another valid UUID.
  const hiddenContractSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await assertNotReturned(hiddenContractSnapshotId);
}
