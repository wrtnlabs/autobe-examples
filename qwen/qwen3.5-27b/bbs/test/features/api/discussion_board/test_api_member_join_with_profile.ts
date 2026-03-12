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

export async function test_api_member_join_with_profile(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful member registration with optional profile fields included.
   * 1. Register a new member with display_name and bio
   * 2. Verify the response contains the provided profile information
   * 3. Validate JWT tokens are generated correctly
   */
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate test data
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  // Register member with profile fields using utility function
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: displayName,
      bio: bio,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Validate response structure
  typia.assert(member);
  // Verify profile information matches input
  TestValidator.equals(
    "display_name matches",
    member.display_name,
    displayName,
  );
  TestValidator.equals("bio matches", member.bio, bio);
  // Verify member ID is a valid UUID
  TestValidator.predicate(
    "has valid member ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      member.id,
    ),
  );
  // Verify account is not banned
  TestValidator.equals("account not banned", member.banned, false);
  // Verify account is not deleted
  TestValidator.equals("account not deleted", member.deleted_at, null);
  // Verify JWT tokens are present
  TestValidator.predicate("has access token", member.token.access.length > 0);
  TestValidator.predicate("has refresh token", member.token.refresh.length > 0);
  // Verify token expiration timestamps are valid date-time format
  TestValidator.predicate(
    "expired_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.token.refreshable_until),
  );
}
