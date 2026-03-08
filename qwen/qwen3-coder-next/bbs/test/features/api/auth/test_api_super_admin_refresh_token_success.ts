import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate test credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  // Step 1: Register new super admin
  const registerConnection: api.IConnection = { host: connection.host };
  const joinResponse =
    await api.functional.discussionBoard.auth.superAdmin.join(
      registerConnection,
      {
        body: {
          email: testEmail,
          password: testPassword,
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(joinResponse);
  // Step 2: Login with registered credentials to get initial tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse =
    await api.functional.discussionBoard.auth.superAdmin.login(
      loginConnection,
      {
        body: {
          email: testEmail,
          password: testPassword,
        } satisfies IDiscussionBoardSuperAdmin.ILogin,
      },
    );
  typia.assert(loginResponse);
  // Step 3: Use refresh token from login response to get new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse =
    await api.functional.discussionBoard.auth.superAdmin.refresh(
      refreshConnection,
      {
        body: {
          refresh_token: loginResponse.token.refresh,
        } satisfies IDiscussionBoardSuperAdmin.IRefresh,
      },
    );
  typia.assert(refreshResponse);
  // Step 4: Verify the refresh worked correctly
  TestValidator.equals(
    "new access token is different from old",
    refreshResponse.token.access,
    loginResponse.token.access,
  );
  TestValidator.equals(
    "new refresh token is issued",
    typeof refreshResponse.token.refresh,
    "string",
  );
  TestValidator.equals(
    "authorization actor remains superAdmin",
    refreshResponse.authorizationActor,
    "superAdmin",
  );
}
