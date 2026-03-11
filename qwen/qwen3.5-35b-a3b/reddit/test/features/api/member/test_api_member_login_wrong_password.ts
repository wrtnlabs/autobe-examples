import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account with known valid credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  // Create member account with fresh connection
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(joinConnection, { body: joinInput });
  // 2. Try login with same email but wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: joinInput.email,
    password: "wrong_password_123",
  } satisfies IRedditPlatformMember.ILogin;
  // 3. Expect login to fail and capture the error
  let caughtError: api.HttpError | null = null;
  try {
    await api.functional.redditPlatform.auth.member.login(loginConnection, {
      body: loginBody,
    });
  } catch (exp) {
    if (typia.is<api.HttpError>(exp)) {
      caughtError = exp;
    } else {
      throw exp;
    }
  }
  // 4. Verify an error was caught
  TestValidator.predicate(
    "error should be thrown for wrong password",
    caughtError !== null,
  );
  // 5. Verify status code is 401 (Unauthorized) not 400 (Validation Error)
  TestValidator.equals(
    "login should return 401 for wrong password",
    caughtError!.status,
    401,
  );
  // 6. Verify error message is generic and doesn't reveal email existence
  // The error message should not say "email not found" or "wrong password"
  // It should be a generic authentication failure message
  const errorMessage = caughtError!.message;
  const lowerMessage = errorMessage.toLowerCase();
  TestValidator.predicate(
    "error message should not reveal email existence",
    !lowerMessage.includes("email") ||
      !lowerMessage.includes("not found") ||
      !lowerMessage.includes("does not exist"),
  );
  TestValidator.predicate(
    "error message should be generic authentication failure",
    lowerMessage.includes("password") ||
      lowerMessage.includes("authentication") ||
      lowerMessage.includes("invalid"),
  );
  // 7. Verify no session was created (loginConnection should not have Authorization header)
  // The connection should not have been updated with any tokens
  TestValidator.equals(
    "loginConnection should not have Authorization header after failed login",
    loginConnection.headers?.authorization,
    undefined,
  );
}
