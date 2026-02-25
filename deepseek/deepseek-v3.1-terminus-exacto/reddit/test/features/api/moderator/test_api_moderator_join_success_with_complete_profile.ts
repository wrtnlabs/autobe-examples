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

/**
 * Test successful moderator registration with complete profile information.
 *
 * This test verifies that the moderator join endpoint correctly creates a moderator
 * account with all provided profile information, including optional fields. It validates
 * that the system generates proper authentication tokens, sets default values for
 * active status and permission level, and returns the complete moderator profile.
 */
export async function test_api_moderator_join_success_with_complete_profile(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection using utility function
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Generate complete profile data with optional fields
  const joinData = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: `https://example.com/avatars/${RandomGenerator.alphabets(10)}.jpg`,
    href: `https://example.com/register`,
    referrer: `https://example.com`,
    ip: `192.168.1.${randint(1, 254)}`,
  } satisfies ICommunityPlatformModerator.IJoin;
  // Execute moderator join using utility function
  const response = await authorize_moderator_join(moderatorConnection, {
    body: joinData,
  });
  // Validate the response structure
  typia.assert(response);
  // Verify all provided fields match the response
  TestValidator.equals("email matches", response.email, joinData.email);
  TestValidator.equals(
    "username matches",
    response.username,
    joinData.username,
  );
  TestValidator.equals(
    "display name matches",
    response.display_name,
    joinData.display_name,
  );
  TestValidator.equals("bio matches", response.bio, joinData.bio);
  TestValidator.equals(
    "avatar URL matches",
    response.avatar_url,
    joinData.avatar_url,
  );
  // Verify default values are set correctly
  TestValidator.predicate(
    "is_active defaults to true",
    response.is_active === true,
  );
  TestValidator.predicate(
    "permission_level is set",
    typeof response.permission_level === "string" &&
      response.permission_level.length > 0,
  );
  // Verify authentication tokens are generated
  TestValidator.predicate(
    "access token exists",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(new Date(response.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(new Date(response.token.refreshable_until).getTime()),
  );
  // Verify timestamps are set
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(response.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(response.updated_at).getTime()),
  );
  // Verify UUID format for moderator ID
  TestValidator.predicate(
    "ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );
}
