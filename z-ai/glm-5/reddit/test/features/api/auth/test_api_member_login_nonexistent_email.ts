import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
 * Test login failure when attempting to authenticate with an email that
 * does not exist in the system.
 *
 * This test validates the anti-enumeration security feature where the system
 * returns the same generic error message for both non-existent email and
 * incorrect password scenarios, preventing attackers from determining which
 * emails are registered in the system.
 */
export async function test_api_member_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate an email that definitely doesn't exist in the system
  const nonexistentEmail = typia.random<string & tags.Format<"email">>();
  // Attempt to login with non-existent email should throw an error
  // The error should be generic to prevent email enumeration attacks
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.communityPlatform.auth.member.login(connection, {
        body: {
          email: nonexistentEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMember.ILogin,
      });
    },
  );
}
