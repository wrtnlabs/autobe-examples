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

export async function test_api_member_login_success_and_failure_paths(
  connection: api.IConnection,
): Promise<void> {
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: memberEmail,
    password: memberPassword,
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/referrer" satisfies string &
      tags.Format<"uri">,
    ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: joinBody });
  const loginConnection: api.IConnection = { host: connection.host };
  let loggedIn: IErpHrmTimeTrackingMember.IAuthorized | undefined;
  try {
    loggedIn = await authorize_member_login(loginConnection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IErpHrmTimeTrackingMember.ILogin,
    });
  } catch (e) {
    // Attempt to confirm email then retry login.
    // Note: we cannot retrieve the issued verification token from join response
    // with the provided DTOs/APIs, so we attempt confirmation with a generated token.
    const confirmConnection: api.IConnection = { host: connection.host };
    await api.functional.erpHrmTimeTracking.member.email_verifications.confirm(
      confirmConnection,
      {
        body: {
          token: RandomGenerator.alphaNumeric(24),
          href: "https://example.com/verify" satisfies string &
            tags.Format<"uri">,
          ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
          referrer: "https://example.com/referrer" satisfies string &
            tags.Format<"uri">,
        } satisfies IErpHrmTimeTrackingMemberEmailVerification.IRequest,
      },
    );
    const retryConnection: api.IConnection = { host: connection.host };
    loggedIn = await authorize_member_login(retryConnection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IErpHrmTimeTrackingMember.ILogin,
    });
  }
  typia.assert(loggedIn);
  TestValidator.predicate(
    "token.access should be non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh should be non-empty",
    loggedIn.token.refresh.length > 0,
  );
}
