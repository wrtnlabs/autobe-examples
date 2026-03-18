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

export async function test_api_member_login_email_verification_gating(
  connection: api.IConnection,
): Promise<void> {
  // Arrange: create a new member account. Email verification is expected to
  // remain unconfirmed after join.
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = `pw-${RandomGenerator.alphaNumeric(24)}`;
  const joinBody = {
    email,
    password,
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    // Keep as a valid ISO currency-like code; schema constraints are not
    // provided here.
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  // Act: attempt to login immediately without confirming email.
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
  } satisfies IErpHrmTimeTrackingMember.ILogin;
  // Assert: login should be rejected / not authorized under unverified state.
  // If login unexpectedly succeeds and returns tokens, the test must fail.
  await TestValidator.error(
    "login must not issue authorization tokens for unverified email",
    async () => {
      const authorized = await authorize_member_login(loginConnection, {
        body: loginBody,
      });
      typia.assert(authorized);
      throw new Error("unexpected: login succeeded for unverified email");
    },
  );
}
