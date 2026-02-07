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

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account through join
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(joinConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(joinOutput);
  // Step 2: Use the created member's credentials to login
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies IDiscussionBoardMember.ILogin;
  const loginOutput = await authorize_member_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loginOutput);
  // Step 3: Validate the login response structure
  TestValidator.predicate(
    "has access token",
    () =>
      typeof loginOutput.token.access === "string" &&
      loginOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    () =>
      typeof loginOutput.token.refresh === "string" &&
      loginOutput.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid access token format",
    () => loginOutput.token.access.split(".").length === 3,
  );
  TestValidator.predicate(
    "has valid refresh token format",
    () => loginOutput.token.refresh.split(".").length === 3,
  );
  // Validate expiration timestamps are proper ISO 8601 date-time format
  TestValidator.predicate("has valid expired_at format", () => {
    try {
      new Date(loginOutput.token.expired_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("has valid refreshable_until format", () => {
    try {
      new Date(loginOutput.token.refreshable_until);
      return true;
    } catch {
      return false;
    }
  });
  // Verify tokens are not empty and different
  TestValidator.notEquals(
    "access and refresh tokens are different",
    loginOutput.token.access,
    loginOutput.token.refresh,
  );
}
