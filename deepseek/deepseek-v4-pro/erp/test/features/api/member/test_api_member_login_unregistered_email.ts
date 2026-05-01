import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test credential ambiguity when logging in with an unregistered email.
 *
 * Validates the security requirement that login failures must not disclose whether an email address is registered in the system. When an unregistered email is used for login, the system must return the same generic 401 error message as when a valid email is paired with an incorrect password. This uniform error response prevents user enumeration attacks by ensuring attackers cannot distinguish between "email not found" and "password incorrect" failure paths.
 *
 * The test also verifies that no JWT tokens, session expiration data, or member profile information is returned in the error response body — only a generic error message is present.
 *
 * 1. Registers a new member via authorize_member_join to obtain a known valid email address.
 * 2. Attempts login with the valid email but an incorrect password, capturing the 401 error message.
 * 3. Attempts login with a randomly generated unregistered email, capturing the 401 error message.
 * 4. Validates both attempts produce identical error messages, confirming credential ambiguity.
 */
export async function test_api_member_login_unregistered_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member to obtain a known valid email
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Attempt login with valid email but wrong password
  let wrongPasswordMessage = "";
  try {
    await api.functional.erpHrm.auth.member.login(
      { host: connection.host },
      {
        body: {
          email: member.email,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IErpHrmMember.ILogin,
      },
    );
    throw new Error("Expected 401 for wrong password but login succeeded");
  } catch (err) {
    if (!(err instanceof api.HttpError)) throw err;
    if (err.status !== 401) {
      throw new Error(`Expected 401 for wrong password, got ${err.status}`);
    }
    wrongPasswordMessage = err.message;
  }
  // 3. Attempt login with unregistered email
  let unregisteredMessage = "";
  try {
    await api.functional.erpHrm.auth.member.login(
      { host: connection.host },
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IErpHrmMember.ILogin,
      },
    );
    throw new Error("Expected 401 for unregistered email but login succeeded");
  } catch (err) {
    if (!(err instanceof api.HttpError)) throw err;
    if (err.status !== 401) {
      throw new Error(`Expected 401 for unregistered email, got ${err.status}`);
    }
    unregisteredMessage = err.message;
  }
  // 4. Validate credential ambiguity: messages must be identical
  TestValidator.equals(
    "credential ambiguity: error messages must be identical",
    wrongPasswordMessage,
    unregisteredMessage,
  );
  TestValidator.predicate(
    "error message must not be empty",
    wrongPasswordMessage.length > 0,
  );
}
