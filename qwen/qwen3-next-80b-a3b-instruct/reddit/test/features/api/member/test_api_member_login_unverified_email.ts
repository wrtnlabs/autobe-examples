import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_login_unverified_email(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member with unverified email using the authorized join function
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const unverifiedMemberConnection: api.IConnection = { host: connection.host };
  const unverifiedMember = await authorize_member_join(
    unverifiedMemberConnection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(unverifiedMember);
  // Verify the member is created with unverified status
  TestValidator.equals(
    "member status should be pending_verification",
    unverifiedMember.status,
    "pending_verification",
  );
  TestValidator.equals(
    "member account_verified should be false",
    unverifiedMember.account_verified,
    false,
  );
  // Attempt to log in using the same credentials
  // This should fail with 401 error because email is not verified (email_verified_at is null)
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login should fail with 401 when email is unverified",
    async () => {
      await api.functional.communityBbs.auth.member.login(loginConnection, {
        body: {
          email: memberEmail,
          password: memberPassword,
        } satisfies ICommunityBbsMember.ILogin,
      });
    },
  );
}
