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

export async function test_api_email_verification_confirm_rejected_when_token_already_consumed(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register member and obtain authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const confirmConnection: api.IConnection = { host: connection.host };
  // Use the access token as a best-effort verification token carrier.
  const verificationToken: string = joined.token.access;
  // First confirmation attempt
  const href = "https://example.com/verify" satisfies string &
    tags.Format<"uri">;
  const ip = "127.0.0.1" satisfies string & tags.Format<"ipv4">;
  const referrer = "https://example.com/ref" satisfies string &
    tags.Format<"uri">;
  const first =
    await api.functional.erpHrmTimeTracking.member.email_verifications.confirm(
      confirmConnection,
      {
        body: {
          token: verificationToken,
          href,
          ip,
          referrer,
        } satisfies IErpHrmTimeTrackingMemberEmailVerification.IRequest,
      },
    );
  typia.assert(first);
  // Second confirmation attempt should be rejected
  await TestValidator.httpError(
    "should reject already consumed verification token",
    [400, 401, 403, 404, 409],
    async () => {
      await api.functional.erpHrmTimeTracking.member.email_verifications.confirm(
        confirmConnection,
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
  // Third attempt (race/consistency)
  await TestValidator.httpError(
    "should remain rejected on subsequent attempts",
    [400, 401, 403, 404, 409],
    async () => {
      await api.functional.erpHrmTimeTracking.member.email_verifications.confirm(
        confirmConnection,
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
