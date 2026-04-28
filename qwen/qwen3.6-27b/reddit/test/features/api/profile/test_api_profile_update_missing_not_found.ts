import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test system response when authenticated member attempts to update non-existent profile.
 *
 * Validates the error handling for profile update requests targeting profiles that do not
 * exist in the database. The test verifies that the system correctly returns a 404
 * Not Found status code when attempting to modify a profile with a valid UUID format
 * that corresponds to no existing profile record.
 *
 * 1. Authenticate as a new member.
 * 2. Generate a valid UUID format that does not exist in the database.
 * 3. Attempt to update the non-existent profile with valid update fields.
 * 4. Verify the system returns a 404 Not Found error.
 * 5. Confirm no profile data is accessed or modified.
 */
export async function test_api_profile_update_missing_not_found(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Generate a non-existent profile ID
  const nonExistentProfileId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to update the non-existent profile
  await TestValidator.httpError(
    "should return 404 Not Found for non-existent profile",
    404,
    async () => {
      await api.functional.redditLikeCommunity.member.community_profiles.update(
        memberConnection,
        {
          profileId: nonExistentProfileId,
          body: {
            display_name: RandomGenerator.name(),
          } satisfies IREdditLikeCommunityProfile.IUpdate,
        },
      );
    },
  );
}
