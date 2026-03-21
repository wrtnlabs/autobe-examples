import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create a fresh connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate random valid credentials for new member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name();
  // Register new member with valid credentials
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Validate the response is a valid IAuthorized structure
  typia.assert(authorized);
  // Validate essential identity fields
  TestValidator.equals("id is valid UUID format", authorized.id.length, 36);
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals("username matches input", authorized.username, username);
  // Validate profile object exists and is properly structured
  TestValidator.predicate("profile exists", authorized.profile !== null);
  TestValidator.predicate(
    "profile has display_name",
    authorized.profile.display_name !== undefined,
  );
  TestValidator.predicate(
    "profile has id",
    authorized.profile.id !== undefined,
  );
  // Validate karma object exists
  TestValidator.predicate("karma exists", authorized.karma !== null);
  TestValidator.predicate("karma has id", authorized.karma.id !== undefined);
  // Validate authorization token structure
  TestValidator.predicate("token exists", authorized.token !== null);
  TestValidator.predicate(
    "access token is non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    authorized.token.refresh.length > 0,
  );
  // Validate JWT token format (should have 3 parts separated by dots)
  const accessTokenParts = authorized.token.access.split(".");
  TestValidator.equals("access token has 3 parts", accessTokenParts.length, 3);
  const refreshTokenParts = authorized.token.refresh.split(".");
  TestValidator.equals(
    "refresh token has 3 parts",
    refreshTokenParts.length,
    3,
  );
  // Validate expiration timestamps are properly formatted
  TestValidator.predicate(
    "expired_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authorized.token.refreshable_until,
    ),
  );
  // Validate timestamps are in the future
  const expiredAtDate = new Date(authorized.token.expired_at);
  const now = new Date();
  TestValidator.predicate("expired_at is in the future", expiredAtDate > now);
  // Validate member timestamps
  TestValidator.predicate(
    "created_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.updated_at),
  );
  // Validate deleted_at is null (account not deleted)
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // Verify the connection headers were updated with the access token
  TestValidator.predicate(
    "connection has Authorization header",
    memberConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "Authorization header contains access token",
    memberConnection.headers?.Authorization,
    authorized.token.access,
  );
}
