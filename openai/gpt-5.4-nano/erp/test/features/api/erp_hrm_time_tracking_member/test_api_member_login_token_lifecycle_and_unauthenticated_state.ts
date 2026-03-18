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

export async function test_api_member_login_token_lifecycle_and_unauthenticated_state(
  connection: api.IConnection,
): Promise<void> {
  const memberPassword = "P@ssw0rd!";
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const joinPayload = {
    email: memberEmail,
    password: memberPassword,
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const authorizedByJoin = await authorize_member_join(joinConnection, {
    body: joinPayload,
  });
  typia.assert(authorizedByJoin);
  // Actor-specific connections
  const memberConnection1: api.IConnection = { host: connection.host };
  const memberConnection2: api.IConnection = { host: connection.host };
  // Scenario 1: consecutive logins
  const firstLogin = await authorize_member_login(memberConnection1, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IErpHrmTimeTrackingMember.ILogin,
  });
  typia.assert(firstLogin);
  const secondLogin = await authorize_member_login(memberConnection2, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IErpHrmTimeTrackingMember.ILogin,
  });
  typia.assert(secondLogin);
  TestValidator.equals(
    "member id stable across logins",
    secondLogin.id,
    firstLogin.id,
  );
  TestValidator.predicate(
    "expired_at present (first login)",
    firstLogin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until present (first login)",
    firstLogin.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "expired_at present (second login)",
    secondLogin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until present (second login)",
    secondLogin.token.refreshable_until.length > 0,
  );
  // Scenario 2: wrong password -> unauthenticated
  const wrongPassword = memberPassword + "-wrong";
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login should fail with incorrect credentials",
    async () => {
      await authorize_member_login(unauthConnection, {
        body: {
          email: memberEmail,
          password: wrongPassword,
        } satisfies IErpHrmTimeTrackingMember.ILogin,
      });
    },
  );
}
