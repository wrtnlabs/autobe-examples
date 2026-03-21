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

export async function test_api_profile_update_display_name_and_bio(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMemberSession.IAuthorized =
    await authorize_member_join(joinConnection, {});
  // 2. Create authenticated member connection for profile update
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 3. Generate display name and bio with unicode and special characters
  const displayName = `テストユーザー_${RandomGenerator.alphabets(5)}`;
  const bio = `Hello! 👋 This is my bio with unicode 🎉 and special chars: @#$%^&*()_+-=[]{}|;':",./<>? ¡Hola!`;
  // 4. Update profile with only display_name and bio (no avatar)
  const updatedProfile: IRedditCloneMemberSession =
    await api.functional.redditClone.users.update(memberConnection, {
      body: {
        display_name: displayName,
        bio: bio,
      } satisfies IRedditCloneMemberSession.IUpdate,
    });
  // 5. Validate response with typia.assert
  typia.assert(updatedProfile);
  // 6. Business logic validations
  TestValidator.equals(
    "display_name matches input",
    updatedProfile.profile.display_name,
    displayName,
  );
  TestValidator.equals(
    "bio matches input with unicode and special chars",
    updatedProfile.profile.bio,
    bio,
  );
  TestValidator.equals(
    "avatar is null (no avatar set)",
    updatedProfile.profile.avatar,
    null,
  );
  TestValidator.predicate(
    "updated_at is recent",
    (() => {
      const updatedAt = new Date(updatedProfile.profile.updated_at);
      const now = new Date();
      const diffMs = now.getTime() - updatedAt.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      return diffMinutes >= 0 && diffMinutes <= 5;
    })(),
  );
  TestValidator.predicate(
    "karma data is included",
    updatedProfile.karma !== undefined && updatedProfile.karma !== null,
  );
  TestValidator.predicate(
    "member id is preserved",
    updatedProfile.id === authorized.id,
  );
}
