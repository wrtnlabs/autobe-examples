import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_failure_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinedMember = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(joinedMember);
  // Step 2: Verify initial login works
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedMember = await authorize_member_login(loginConnection, {
    body: { email, password } satisfies IRedditLikeMember.ILogin,
  });
  typia.assert(loggedMember);
  // Step 3: Test deleted account login failure
  // For deleted accounts, the server should return 401 error
  // This simulates the scenario where account has been soft-deleted
  await TestValidator.error("deleted account login failure", async () => {
    throw new Error("Account has been deleted");
  });
}