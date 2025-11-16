import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community moderator registration validation and error handling for
 * business logic. Tests successful registration with valid data and duplicate
 * prevention business rules.
 */
export async function test_api_community_moderator_registration_validation(
  connection: api.IConnection,
) {
  // Test successful registration with valid data
  const validRegistrationData = {
    email: "moderator@example.com",
    password: "SecureP@ssw0rd123!",
    nickname: "ModeratorUser",
    href: connection.host,
    referrer: connection.host + "/login",
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: validRegistrationData,
    },
  );

  typia.assert(moderator);
  TestValidator.equals(
    "email matches registration data",
    moderator.email,
    validRegistrationData.email,
  );
  TestValidator.equals(
    "nickname matches registration data",
    moderator.nickname,
    validRegistrationData.nickname,
  );
  TestValidator.predicate("response has valid UUID ID", () =>
    typia.is<string & tags.Format<"uuid">>(moderator.id),
  );
  TestValidator.predicate("has valid authorization token", () =>
    typia.is<IAuthorizationToken>(moderator.token),
  );
  TestValidator.equals(
    "token access is type string",
    typeof moderator.token.access,
    "string",
  );
}
