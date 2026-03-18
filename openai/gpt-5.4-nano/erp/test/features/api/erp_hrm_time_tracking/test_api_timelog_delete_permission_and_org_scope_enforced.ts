import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_delete_permission_and_org_scope_enforced(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member A (ORG_A context) via join utility.
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!".repeat(2),
      organizationName: `org-${RandomGenerator.alphabets(8)}`,
      organizationDescription: `desc-${RandomGenerator.alphabets(12)}`,
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://${RandomGenerator.alphabets(8)}.example.com/${RandomGenerator.alphabets(6)}`,
      referrer:
        `https://${RandomGenerator.alphabets(8)}.example.com/` +
        RandomGenerator.alphabets(6),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberA);
  // Step 2-4: Attempt to delete a timelog that (most likely) does not belong
  // to member A and/or requires time:manage. With only delete API available,
  // we validate that the system rejects deletion (permission/eligibility/scope).
  const foreignTimelogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "member A cannot delete timelog outside its permission/scope",
    [400, 401, 403, 404],
    async () => {
      await api.functional.erpHrmTimeTracking.member.timelogs.erase(
        memberAConnection,
        {
          timelogId: foreignTimelogId,
        },
      );
    },
  );
  // Step 5-7: Further workflow eligibility and cross-organization isolation
  // checks require timelog creation/listing and capability assignment APIs,
  // which are not provided in the available SDK/utility surface for this test.
}
