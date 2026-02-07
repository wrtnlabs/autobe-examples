import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account with empty body (as per DTO definition)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.discussionBoard.auth.admin.join(
    joinConnection,
    {
      body: {} satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(joinResponse);
  // Step 2: Login with empty body (as per DTO definition)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await api.functional.discussionBoard.auth.admin.login(
    loginConnection,
    {
      body: {} satisfies IDiscussionBoardAdmin.ILogin,
    },
  );
  typia.assert(loginResponse);
  // Step 3: Validate login response structure
  const { token } = loginResponse;
  // Verify token structure exists
  TestValidator.equals("access token exists", token.access.length > 0, true);
  TestValidator.equals("refresh token exists", token.refresh.length > 0, true);
  // Verify expiration timestamps are valid ISO 8601 format
  TestValidator.predicate("expired_at is valid date-time", () => {
    const date = new Date(token.expired_at);
    return !isNaN(date.getTime()) && token.expired_at.includes("T");
  });
  TestValidator.predicate("refreshable_until is valid date-time", () => {
    const date = new Date(token.refreshable_until);
    return !isNaN(date.getTime()) && token.refreshable_until.includes("T");
  });
  // Verify refreshable_until is after expired_at (session validity window)
  TestValidator.predicate("refreshable_until after expired_at", () => {
    return (
      new Date(token.refreshable_until).getTime() >
      new Date(token.expired_at).getTime()
    );
  });
}
