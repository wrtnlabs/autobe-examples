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

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomString(length: number): string {
  return Array.from({ length }, () => ALPHABET[randint(0, ALPHABET.length - 1)]).join("");
}

export async function test_api_auth_member_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: `test_${randomString(10)}@example.com`,
      password: randomString(16),
      username: RandomGenerator.name(),
    },
  });
  typia.assert(initialAuth);
  // 2. Extract refresh token from the join response
  const refreshToken = initialAuth.token.refresh;
  // 3. Use the refresh token to obtain new tokens
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshedConnection, {
    body: {
      refreshToken: refreshToken,
    },
  });
  typia.assert(refreshedAuth);
  // 4. Validate the refreshed response contains valid member information
  TestValidator.equals(
    "member id is valid UUID",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "username matches",
    refreshedAuth.username,
    initialAuth.username,
  );
  TestValidator.equals(
    "displayName matches",
    refreshedAuth.displayName,
    initialAuth.displayName,
  );
  TestValidator.equals(
    "karmaScore is zero for new member",
    refreshedAuth.karmaScore,
    0,
  );
  // 5. Validate that new tokens are structurally valid
  TestValidator.predicate(
    "new access token is non-empty string",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is non-empty string",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expired_at is valid date-time",
    /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}/.test(
      refreshedAuth.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refresh token refreshable_until is valid date-time",
    /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}/.test(
      refreshedAuth.token.refreshable_until,
    ),
  );
}