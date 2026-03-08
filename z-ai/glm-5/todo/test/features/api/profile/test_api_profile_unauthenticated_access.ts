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

/**
 * Test that unauthenticated requests to retrieve profile are rejected.
 *
 * 1. Create a connection without authentication headers
 * 2. Attempt to retrieve profile without authentication
 * 3. Verify the API returns 401 Unauthorized status code
 * 4. Ensure no profile data is leaked in the response
 *
 * This test validates the security requirement that only authenticated
 * members can access their profile information. The profile is completely
 * private and requires valid session/token to access.
 */
export async function test_api_profile_unauthenticated_access(
  connection: api.IConnection,
): Promise<void> {
  // Create an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Attempt to access profile without authentication
  // Should return 401 Unauthorized
  await TestValidator.httpError(
    "unauthenticated profile access should be rejected",
    401,
    async () => {
      await api.functional.todoApp.member.profile.at(unauthenticatedConnection);
    },
  );
}
