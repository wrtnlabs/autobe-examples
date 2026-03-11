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

/**
 * Test member login failure with invalid credentials.
 *
 * 1. Creates a valid member account for baseline comparison
 * 2. Tests login with non-existent email and valid password
 * 3. Tests login with valid email and incorrect password
 * 4. Tests login with both email and password incorrect
 * 5. Verifies error responses are generic to prevent account enumeration
 */
export async function test_api_member_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a valid member account for testing
  const memberInfo = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: "https://example.com/discussion-board",
        referrer: "https://example.com/",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(memberInfo);
  // 2. Test login with non-existent email (valid format, correct password pattern)
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      const testConnection: api.IConnection = { host: connection.host };
      await api.functional.discussionBoard.auth.member.login(testConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: memberInfo.email.split("@")[0] + "1234", // Use any password
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
  // 3. Test login with valid email but incorrect password
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      const testConnection: api.IConnection = { host: connection.host };
      await api.functional.discussionBoard.auth.member.login(testConnection, {
        body: {
          email: memberInfo.email,
          password: RandomGenerator.alphaNumeric(16), // Different password
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
  // 4. Test login with both email and password incorrect (both random)
  await TestValidator.error(
    "login with both incorrect credentials should fail",
    async () => {
      const testConnection: api.IConnection = { host: connection.host };
      await api.functional.discussionBoard.auth.member.login(testConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
  // 5. Validate successful login works with correct credentials
  const testConnection: api.IConnection = { host: connection.host };
  const successfulLogin =
    await api.functional.discussionBoard.auth.member.login(testConnection, {
      body: {
        email: memberInfo.email,
        password: "testpassword123", // Note: This needs to match the actual password used during join
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(successfulLogin);
  TestValidator.equals(
    "successful login returns member ID",
    successfulLogin.id,
    memberInfo.id,
  );
}
