import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Define profile update values
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  const newAvatarUrl = "https://example.com/avatar.jpg" satisfies string &
    tags.Format<"uri">;
  // 3. Update profile
  const updatedProfile =
    await api.functional.redditCommunity.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: newDisplayName,
          bio: newBio,
          avatar_url: newAvatarUrl,
        } satisfies IRedditCommunityUserProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate profile fields
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals("bio updated", updatedProfile.bio, newBio);
  TestValidator.equals(
    "avatar_url updated",
    updatedProfile.avatar_url,
    newAvatarUrl,
  );
  TestValidator.equals("karma is zero for new user", updatedProfile.karma, 0);
  TestValidator.predicate(
    "created_at is ISO 8601",
    /\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z/.test(
      updatedProfile.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    /\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z/.test(
      updatedProfile.updated_at,
    ),
  );
  TestValidator.predicate(
    "id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      updatedProfile.id,
    ),
  );
}
