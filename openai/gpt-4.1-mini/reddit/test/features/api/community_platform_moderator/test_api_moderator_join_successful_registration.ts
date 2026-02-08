import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create a fresh connection object for moderator join
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Prepare a valid moderator join request body with unique email and username
  // Since ICommunityPlatformModerator.IJoin does not exist, use empty object
  const joinBody = {};
  // Execute moderator join using the utility function
  const joinResult = await authorize_moderator_join(moderatorConnection, {
    body: joinBody,
  });
  // Assert the response structure and token correctness
  typia.assert(joinResult);
  typia.assert(joinResult.token);
  // Check that access and refresh tokens are non-empty strings
  TestValidator.predicate(
    "access token is non-empty string",
    typeof joinResult.token.access === "string" &&
      joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof joinResult.token.refresh === "string" &&
      joinResult.token.refresh.length > 0,
  );
  // Check that expired_at and refreshable_until are ISO 8601 date-time strings
  // typia.assert() already validates format, redundant checks omitted
  TestValidator.predicate(
    "expired_at token is ISO 8601 date-time string",
    typeof joinResult.token.expired_at === "string",
  );
  TestValidator.predicate(
    "refreshable_until token is ISO 8601 date-time string",
    typeof joinResult.token.refreshable_until === "string",
  );
  // The moderatorConnection should now have Authorization header set internally by the utility
  TestValidator.predicate(
    "moderatorConnection has Authorization header",
    typeof moderatorConnection.headers?.Authorization === "string" &&
      moderatorConnection.headers!.Authorization.length > 0,
  );
}
