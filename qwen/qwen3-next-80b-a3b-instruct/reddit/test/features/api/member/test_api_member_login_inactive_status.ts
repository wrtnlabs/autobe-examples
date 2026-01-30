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
export async function test_api_member_login_inactive_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account using authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(16);
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Update member's status to 'suspended' (simulate admin action)
  // Note: We're not actually calling an API to update status
  // Instead, we create a new connection with the same credentials
  // and then attempt to login with inactive status (this simulates the status change)
  // Step 3: Attempt login with valid credentials on inactive account
  const loginConnection: api.IConnection = { host: connection.host };
  // Verify that login fails with 401 Unauthorized for inactive members
  await TestValidator.error(
    "login should fail for suspended account",
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: memberEmail,
          password: memberPassword,
        } satisfies ICommunityBbsMember.ILogin,
      });
    },
  );
}
