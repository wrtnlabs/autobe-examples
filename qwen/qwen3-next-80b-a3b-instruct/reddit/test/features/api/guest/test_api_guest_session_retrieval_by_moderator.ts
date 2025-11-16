import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

export async function test_api_guest_session_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to gain access to guest session data
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail satisfies IModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve a guest session using the authenticated moderator connection
  const guestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const guestSession: ICommunityPlatformGuest =
    await api.functional.communityPlatform.moderator.guests.at(connection, {
      guestId,
    });
  typia.assert(guestSession);

  // Step 3: Verify the retrieved guest session matches expected structure and contains no personal identifying data beyond session metadata
  // Note: ICommunityPlatformGuest is defined as a string type, so we verify it's a valid string response
  TestValidator.predicate(
    "guest session is a non-empty string",
    typeof guestSession === "string" && guestSession.length > 0,
  );
}
