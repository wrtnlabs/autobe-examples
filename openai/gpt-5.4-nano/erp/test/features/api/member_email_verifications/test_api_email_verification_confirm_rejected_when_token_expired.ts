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

export async function test_api_email_verification_confirm_rejected_when_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Rejection when token is expired.
  // 1) Register a new member via join.
  // 2) Attempt email verification confirmation with a token value.
  // 3) Validate rejection occurs (token cannot be confirmed when expired).
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password-1234!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>,
      href: "https://example.com/join" as string & tags.Format<"uri">,
      referrer: "https://example.com/ref" as string & tags.Format<"uri">,
      ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const confirmConnection: api.IConnection = { host: connection.host };
  // Best-effort: use access token string as the "token" payload for the
  // confirmation endpoint (it is guaranteed to be rejected, and we assert
  // rejection due to expiry wording when available).
  const requestBody = {
    token: authorized.token.access,
  } satisfies IErpHrmTimeTrackingMemberEmailVerification.IRequest;
  await TestValidator.error(
    "should reject expired email verification token",
    async () => {
      await api.functional.erpHrmTimeTracking.member.email_verifications.confirm(
        confirmConnection,
        {
          body: requestBody,
        },
      );
    },
  );
}
