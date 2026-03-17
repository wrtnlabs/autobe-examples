import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_session_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Prepare specific session tracking metadata
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  const testHref = "https://example.com/register";
  const testReferrer = "https://google.com/search?q=todo+app";
  const testIp = "192.168.1.100";
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Register member with specific session metadata
  const authorized: IPrivateTodoAppMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: testEmail,
        password: testPassword,
        href: testHref,
        referrer: testReferrer,
        ip: testIp,
      },
    });
  // Validate response structure - typia.assert validates all types completely
  typia.assert(authorized);
  // Verify business logic: email matches input
  TestValidator.equals("email matches", authorized.email, testEmail);
  // Verify business logic: session was created and connection has authorization
  TestValidator.predicate(
    "connection has authorization",
    !!memberConnection.headers?.Authorization,
  );
}
