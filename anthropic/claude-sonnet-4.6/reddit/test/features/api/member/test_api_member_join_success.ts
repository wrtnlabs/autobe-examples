import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Step 1: Create a fresh member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Prepare registration data
  const username = `testuser_${RandomGenerator.alphaNumeric(8)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // >= 8 chars
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Step 3: Call authorize_member_join utility (MANDATORY - utility exists for this endpoint)
  const result = await authorize_member_join(memberConnection, {
    body: {
      username,
      email,
      password,
      href,
      referrer,
    },
  });
  // Step 4: Validate full response type conformance
  typia.assert(result);
  // Step 5: Assert business logic - profile fields at registration
  TestValidator.equals(
    "display_name is null at registration",
    result.display_name,
    null,
  );
  TestValidator.equals("bio is null at registration", result.bio, null);
  TestValidator.equals(
    "avatar_url is null at registration",
    result.avatar_url,
    null,
  );
  TestValidator.equals(
    "karma_score is 0 at registration",
    result.karma_score,
    0,
  );
  // Step 6: Assert submitted values are reflected in response
  TestValidator.equals(
    "username matches submitted value",
    result.username,
    username,
  );
  TestValidator.equals("email matches submitted value", result.email, email);
  // Step 7: Assert token fields are non-empty (live session)
  TestValidator.predicate(
    "access token is non-empty",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    result.token.refresh.length > 0,
  );
  // Step 8: Assert token expiration is in the future
  const now = new Date();
  const expiredAt = new Date(result.token.expired_at);
  const refreshableUntil = new Date(result.token.refreshable_until);
  TestValidator.predicate(
    "access token expired_at is in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    refreshableUntil > expiredAt,
  );
  // Step 9: Confirm token was set on connection (atomicity of registration + session issuance)
  // The SDK's @setHeader annotation auto-sets memberConnection.headers.Authorization = result.token.access
  TestValidator.predicate(
    "authorization header set on connection after join",
    memberConnection.headers !== undefined &&
      memberConnection.headers.Authorization === result.token.access,
  );
}
