import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate valid test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // 12 characters ensures >= 8
  // Execute member join operation using utility function
  const result = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Validate the response structure
  typia.assert(result);
  // Verify the returned token structure
  TestValidator.equals(
    "has valid access token",
    result.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "has valid refresh token",
    result.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "has valid expired_at",
    result.token.expired_at.length > 0,
    true,
  );
  TestValidator.equals(
    "has valid refreshable_until",
    result.token.refreshable_until.length > 0,
    true,
  );
  // Verify the user ID is a valid UUID
  TestValidator.equals(
    "has valid UUID id",
    typia.is<string & tags.Format<"uuid">>(result.id),
    true,
  );
  // Validate the date-time formats are ISO 8601 compatible
  const expiredDate = new Date(result.token.expired_at);
  const refreshableDate = new Date(result.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is valid date-time",
    !isNaN(expiredDate.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !isNaN(refreshableDate.getTime()),
  );
  // Ensure refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableDate > expiredDate,
  );
  // Verify the user can login with these credentials (additional validation)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IRedditCommunityMember.ILogin,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "login returns valid user ID",
    loginResult.id,
    result.id,
  );
}
