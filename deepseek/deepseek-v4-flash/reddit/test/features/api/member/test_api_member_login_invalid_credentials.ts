import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a member to obtain a valid registered email
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {});
  typia.assert(joined);
  const registeredEmail = joined.email;
  // Step 2: Test wrong email → expect 401
  const wrongEmailBody: ICommunityPlatformMember.ILogin = {
    email: "nonexistent@example.com",
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  let wrongEmailError: Error | null = null;
  try {
    await api.functional.communityPlatform.auth.member.login(
      { host: connection.host },
      { body: wrongEmailBody },
    );
  } catch (e) {
    wrongEmailError = e as Error;
  }
  if (wrongEmailError === null)
    throw new Error("Login with non-existent email should have failed");
  TestValidator.equals(
    "wrong email status",
    (wrongEmailError as any).status,
    401,
  );
  // Step 3: Test wrong password → expect 401
  const wrongPasswordBody: ICommunityPlatformMember.ILogin = {
    email: registeredEmail,
    password: "wrongpassword123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  let wrongPasswordError: Error | null = null;
  try {
    await api.functional.communityPlatform.auth.member.login(
      { host: connection.host },
      { body: wrongPasswordBody },
    );
  } catch (e) {
    wrongPasswordError = e as Error;
  }
  if (wrongPasswordError === null)
    throw new Error("Login with wrong password should have failed");
  TestValidator.equals(
    "wrong password status",
    (wrongPasswordError as any).status,
    401,
  );
  // Step 4: Verify both errors have identical messages (no email enumeration)
  TestValidator.equals(
    "identical error messages for wrong email and wrong password",
    wrongEmailError.message,
    wrongPasswordError.message,
  );
}
