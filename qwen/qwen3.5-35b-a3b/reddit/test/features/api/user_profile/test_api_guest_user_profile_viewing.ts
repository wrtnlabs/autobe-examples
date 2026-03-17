import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_user_profile_viewing(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest session for unauthenticated access
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditCommunityGuest.IJoin>(),
  });
  typia.assert(guestAuth);
  // Step 2: Create a member user to view their profile
  // Note: The member user must already exist in the system
  // We'll generate a valid UUID for testing
  const memberUserId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Query the profile endpoint as guest
  const profileData =
    await api.functional.redditCommunity.guest.users.profile.at(
      guestConnection,
      {
        userId: memberUserId,
      },
    );
  typia.assert(profileData);
  // Step 4: Validate response structure matches ISummary DTO
  TestValidator.equals("profile id matches", profileData.id, memberUserId);
  TestValidator.equals(
    "display_name is string",
    typeof profileData.display_name,
    "string",
  );
  TestValidator.equals(
    "karma_score is number",
    typeof profileData.karma_score,
    "number",
  );
  TestValidator.equals(
    "created_at is string",
    typeof profileData.created_at,
    "string",
  );
  // Step 5: Validate karma_score is valid int32 range
  TestValidator.predicate("karma_score within int32 range", () => {
    const karma = profileData.karma_score;
    return karma >= -2147483648 && karma <= 2147483647;
  });
  // Step 6: Validate created_at is valid ISO 8601 datetime
  TestValidator.predicate("created_at is valid datetime", () => {
    const date = new Date(profileData.created_at);
    return !isNaN(date.getTime());
  });
  // Step 7: Validate bio is nullable string
  TestValidator.equals("bio is valid type", typeof profileData.bio, "string");
  // Step 8: Validate avatar_image_url is valid URI or null
  TestValidator.predicate("avatar is valid URI or null", () => {
    if (
      profileData.avatar_image_url === null ||
      profileData.avatar_image_url === undefined
    ) {
      return true;
    }
    try {
      new URL(profileData.avatar_image_url!);
      return true;
    } catch {
      return false;
    }
  });
}
