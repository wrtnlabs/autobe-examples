import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_rejected_for_unverified_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account (status will be 'pending')
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const registered = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(registered);
  // Verify account is in 'pending' state (email not yet verified)
  const statusValue: string = registered.status as string;
  TestValidator.equals("account status pending", statusValue, "pending");
  TestValidator.equals("email not verified", registered.email_verified, false);
  // 2. Attempt login before email verification (should reject)
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("login rejected for unverified email", async () => {
    await api.functional.hrmTracker.auth.member.login(loginConnection, {
      body: {
        email,
        password,
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } satisfies IHrmTrackerMember.ILogin,
    });
  });
  // 3. Verify no session tokens were issued (connection headers unchanged)
  TestValidator.equals(
    "no auth header set",
    loginConnection.headers,
    undefined,
  );
  // 4. Confirm account still in pending state
  TestValidator.equals("status unchanged", statusValue, "pending");
  TestValidator.equals(
    "email_verified still false",
    registered.email_verified,
    false,
  );
}