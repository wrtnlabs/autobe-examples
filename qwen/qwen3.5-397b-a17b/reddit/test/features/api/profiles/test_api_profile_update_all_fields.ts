import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success scenario where an authenticated member updates all three
 * profile fields (display_name, bio, and avatar) in a single request. The member joins
 * the platform, then updates their profile with a new display name, bio text, and avatar
 * image URI. Validate that the response contains the updated profile with all three
 * fields changed, the updated_at timestamp is newer than created_at, and the changes
 * are immediately visible. This validates the core business workflow of profile customization.
 */
export async function test_api_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    });
  typia.assert(authorized);
  // 2. Update all three profile fields
  const updateBody = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCloneUserProfile.IUpdate;
  const updatedProfile: IRedditCloneUserProfile =
    await api.functional.redditClone.profiles.update(memberConnection, {
      body: updateBody,
    });
  typia.assert(updatedProfile);
  // 3. Validate all fields were updated correctly
  TestValidator.equals(
    "display_name matches",
    updatedProfile.display_name,
    updateBody.display_name,
  );
  TestValidator.equals("bio matches", updatedProfile.bio, updateBody.bio);
  TestValidator.equals(
    "avatar matches",
    updatedProfile.avatar,
    updateBody.avatar,
  );
  // 4. Validate timestamps
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedProfile.updated_at).getTime() >=
      new Date(updatedProfile.created_at).getTime(),
  );
  // 5. Validate username is preserved from registration
  TestValidator.equals(
    "username preserved",
    updatedProfile.username,
    authorized.username,
  );
}
