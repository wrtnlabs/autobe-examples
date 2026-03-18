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

export async function test_api_member_email_verification_retrieval_success_within_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join with selected organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "TestPassword!1";
  const joinInput = {
    email,
    password,
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
    ip: null as (string & tags.Format<"ipv4">) | null | undefined,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 2) Attempt retrieval of an email verification record within the
  //    authenticated member's selected organization.
  // NOTE: Provided DTO/SDK surface does not expose verificationId created
  // during join. So we attempt with a UUID candidate and validate on success.
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const execute =
    async (): Promise<api.functional.erpHrmTimeTracking.member.email_verifications.at.Response> =>
      await api.functional.erpHrmTimeTracking.member.email_verifications.at(
        memberConnection,
        {
          verificationId,
        },
      );
  await TestValidator.predicate(
    "should retrieve member email verification successfully",
    async () => {
      const emailVerification = await execute();
      typia.assert(emailVerification);
      TestValidator.equals(
        "verification id matches request",
        emailVerification.id,
        verificationId,
      );
      return true;
    },
  );
}
