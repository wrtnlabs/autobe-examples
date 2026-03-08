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

export async function test_api_member_profile_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an UNAUTHENTICATED connection (no token in headers)
  // This connection has no Authorization token, simulating a guest user
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // 2. Attempt to access profile without authentication
  // This should fail with 401 Unauthorized or 403 Forbidden
  await TestValidator.error("profile requires authentication", async () => {
    await api.functional.todoApp.member.profile.at(unauthorizedConnection);
  });
  // 3. Verify that authentication enables profile access
  // Join a member to establish valid session
  const authorizedConnection: api.IConnection = { host: connection.host };
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    authorizedConnection,
    {
      body: typia.random<ITodoAppMember.IJoin>(),
    },
  );
  typia.assert(authorized);
  // 4. Verify authenticated request succeeds and returns valid profile
  const profile: ITodoAppMember =
    await api.functional.todoApp.member.profile.at(authorizedConnection);
  typia.assert(profile);
  TestValidator.equals(
    "profile id matches authorized user id",
    profile.id,
    authorized.id,
  );
}
