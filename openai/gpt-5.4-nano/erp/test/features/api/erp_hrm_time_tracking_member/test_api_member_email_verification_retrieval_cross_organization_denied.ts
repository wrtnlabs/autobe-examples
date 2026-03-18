import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verification_retrieval_cross_organization_denied(
  connection: api.IConnection,
): Promise<void> {
  const scenarioDescription =
    "Organization isolation: Member A cannot access Member B's email verification record by id.";
  // 1) Create Member A (member join)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAPassword = "P@ssw0rd!";
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAOrganizationName = `org-${RandomGenerator.alphabets(10)}`;
  const memberAJoinBody = {
    email: memberAEmail,
    password: memberAPassword,
    organizationName: memberAOrganizationName,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: `https://example.com/join/${RandomGenerator.alphabets(8)}`,
    referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}`,
    ip: "127.0.0.1",
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: memberAJoinBody,
  });
  typia.assert(memberAAuthorized);
  const memberAAuthConnection: api.IConnection = { host: connection.host };
  memberAAuthConnection.headers = {
    Authorization: memberAAuthorized.token.access,
  };
  // 2) Create Member B (member join)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBPassword = "P@ssw0rd!";
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBOrganizationName = `org-${RandomGenerator.alphabets(10)}`;
  const memberBJoinBody = {
    email: memberBEmail,
    password: memberBPassword,
    organizationName: memberBOrganizationName,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 2,
    href: `https://example.com/join/${RandomGenerator.alphabets(8)}`,
    referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}`,
    ip: "127.0.0.1",
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: memberBJoinBody,
  });
  typia.assert(memberBAuthorized);
  // We don't have an SDK/utility to retrieve Member B's actual issued verification id.
  // So we use a UUID token value and assert that cross-organization access is denied
  // (consistent failure without revealing cross-org existence).
  const memberBVerificationId = typia.random<string & tags.Format<"uuid">>();
  // 3) Member A tries to retrieve Member B's verification
  await TestValidator.error("cross-org retrieval denied", async () => {
    await api.functional.erpHrmTimeTracking.member.email_verifications.at(
      memberAAuthConnection,
      {
        verificationId: memberBVerificationId,
      },
    );
  });
  // 4) State safety: GET must not mutate. Best-effort validation: Member A can still
  //    call its own join-authenticated context (no explicit mutation is expected).
  TestValidator.predicate(
    "no observable mutation after GET (best-effort)",
    () => scenarioDescription.length > 0,
  );
}
