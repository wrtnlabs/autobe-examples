import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
  // 1. Create a member account first
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "correctPassword123",
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // Helper to capture HttpError
  const captureError = async (
    task: () => Promise<unknown>,
  ): Promise<api.HttpError> => {
    try {
      await task();
      throw new Error("Expected HttpError to be thrown");
    } catch (error) {
      if (!typia.is<api.HttpError>(error)) throw error;
      return error;
    }
  };
  // 2. Test login with wrong password - should fail with 401
  const wrongPasswordError = await captureError(async () => {
    const loginConnection: api.IConnection = { host: connection.host };
    await api.functional.discussionBoard.auth.member.login(loginConnection, {
      body: {
        email: member.email,
        password: "wrongPassword456",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ILogin,
    });
  });
  await TestValidator.httpError("wrong password status", 401, async () => {
    throw wrongPasswordError;
  });
  // 3. Test login with non-existent email - should fail with 401
  const nonExistentEmailError = await captureError(async () => {
    const loginConnection: api.IConnection = { host: connection.host };
    await api.functional.discussionBoard.auth.member.login(loginConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "anyPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ILogin,
    });
  });
  await TestValidator.httpError("non-existent email status", 401, async () => {
    throw nonExistentEmailError;
  });
  // 4. Verify both error messages are identical (email enumeration prevention)
  TestValidator.equals(
    "error messages identical for email enumeration prevention",
    wrongPasswordError.message,
    nonExistentEmailError.message,
  );
}
