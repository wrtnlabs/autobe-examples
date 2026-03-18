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

export async function test_api_email_verification_confirm_success_then_reuse_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register member and obtain join-issued context
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/referrer" satisfies string &
      tags.Format<"uri">,
    ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // NOTE: IErpHrmTimeTrackingMember.IAuthorized doesn't explicitly expose
  // email-verification token. Use the join-issued authorization token access
  // as the verification token candidate to drive the email confirmation flow.
  const verificationToken = authorized.token.access;
  // 2) Confirm email verification
  const href = "https://example.com/verify" satisfies string &
    tags.Format<"uri">;
  const ip = "127.0.0.1" satisfies string & tags.Format<"ipv4">;
  const referrer = "https://example.com/login" satisfies string &
    tags.Format<"uri">;
  const confirmed =
    await api.functional.erpHrmTimeTracking.member.email_verifications.confirm(
      memberConnection,
      {
        body: {
          token: verificationToken,
          href,
          ip,
          referrer,
        } satisfies IErpHrmTimeTrackingMemberEmailVerification.IRequest,
      },
    );
  typia.assert(confirmed);
  TestValidator.equals(
    "confirmed verification token matches input",
    confirmed.token,
    verificationToken,
  );
  // 3) Reuse same token should be rejected
  await TestValidator.error(
    "reusing same email verification token should be rejected",
    async () => {
      await api.functional.erpHrmTimeTracking.member.email_verifications.confirm(
        memberConnection,
        {
          body: {
            token: verificationToken,
            href,
            ip,
            referrer,
          } satisfies IErpHrmTimeTrackingMemberEmailVerification.IRequest,
        },
      );
    },
  );
}
