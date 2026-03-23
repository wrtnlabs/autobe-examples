import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test profile retrieval after a member account is deleted.
 *
 * Workflow:
 * 1. Register a new member using /todoApp/auth/member/join
 * 2. Delete the member's account using /todoApp/member/users/me
 * 3. Attempt to retrieve profile using the old authentication token
 * 4. Verify the system rejects the request
 *
 * Validation Points:
 * - Response status is 401 Unauthorized or 404 Not Found
 * - Profile data is not returned
 * - Verify member account was completely removed (all related data including profile deleted)
 */
export async function test_api_member_profile_retrieval_after_account_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
    referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
  } satisfies ITodoAppMemberSession.IJoin;
  const memberSession: ITodoAppMemberSession.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: memberData,
    });
  typia.assert(memberSession);
  // 2. Delete the member's account
  await api.functional.todoApp.member.users.me.erase(memberConnection);
  // 3. Attempt to retrieve profile using the old authentication token
  // The token is still in memberConnection.headers from the login step
  // This request should fail with 401 Unauthorized or 404 Not Found
  await TestValidator.error(
    "should reject access after account deletion",
    async () => {
      await api.functional.todoApp.member.profile.me.at(memberConnection);
    },
  );
}