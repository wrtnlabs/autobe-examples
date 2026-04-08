import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_auth_member_refresh_session_continuation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      username: "testuser" + randint(0, 1000000),
      email: `test${randint(0, 1000000)}@test.com`,
      password: "testPassword123!",
    },
  });
  typia.assert(initialAuth);
  // Store the initial access token
  const initialAccessToken = initialAuth.token.access;
  const refreshToken = initialAuth.token.refresh;
  // 2. Use the refresh endpoint to obtain new tokens
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshedConnection, {
    body: {
      refreshToken: refreshToken,
    } satisfies IRedditCloneMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Verify the new access token is different from the original
  TestValidator.notEquals(
    "new access token should be different from original",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  // 4. Validate the refreshed session contains valid member data
  TestValidator.equals(
    "member id should remain the same after refresh",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "username should remain the same after refresh",
    refreshedAuth.username,
    initialAuth.username,
  );
  // 5. Verify the refreshed tokens are valid (has required properties)
  TestValidator.predicate(
    "new access token should not be empty",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should not be empty",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration should be in the future",
    new Date(refreshedAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh expiration should be in the future",
    new Date(refreshedAuth.token.refreshable_until) > new Date(),
  );
}
