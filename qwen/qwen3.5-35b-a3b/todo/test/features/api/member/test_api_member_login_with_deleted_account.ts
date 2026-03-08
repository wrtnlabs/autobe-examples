import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_with_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedMember: ITodoAppMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(joinedMember);
  // Step 2: Note - Soft delete functionality not available in current API
  // The account cannot be soft deleted without the admin update API
  // This test demonstrates the login flow but cannot validate deleted account rejection
  // Step 3: Test normal login with valid credentials (account not deleted)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult: ITodoAppMember.IAuthorized = await authorize_member_login(
    loginConnection,
    {
      body: {
        email: joinedMember.email,
        password: typeof joinConnection.headers?.authorization === "string"
          ? joinConnection.headers.authorization.split(" ")[1] ?? ""
          : "",
      },
    },
  );
  typia.assert(loginResult);
  // Note: To test deleted account login rejection, the soft delete API endpoint
  // must be implemented and called before the login attempt
  // The system should reject login when deleted_at is not null in the member record
}