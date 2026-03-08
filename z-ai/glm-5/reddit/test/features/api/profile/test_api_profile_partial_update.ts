import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {});
  typia.assert(auth);
  // 2. Set initial profile values (bio and avatar_url)
  const initialBio = RandomGenerator.paragraph({ sentences: 3 });
  const initialAvatarUrl = "https://example.com/avatar-initial.jpg";
  const initialProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: auth.displayName,
          bio: initialBio,
          avatar_url: initialAvatarUrl,
        } satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  typia.assert(initialProfile);
  // 3. Update only display_name (partial update - omit bio and avatar_url)
  const newDisplayName = RandomGenerator.name();
  const partialUpdate =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: newDisplayName,
        } satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  typia.assert(partialUpdate);
  // 4. Verify display_name is updated to the new value
  TestValidator.equals(
    "display_name updated",
    partialUpdate.displayName,
    newDisplayName,
  );
  // 5. Verify bio and avatar_url retain their previous values (not cleared)
  TestValidator.equals("bio retained", partialUpdate.bio, initialBio);
  TestValidator.equals(
    "avatar_url retained",
    partialUpdate.avatarUrl,
    initialAvatarUrl,
  );
  // 6. Verify karma and username remain unchanged
  TestValidator.equals(
    "karma unchanged",
    partialUpdate.karma,
    initialProfile.karma,
  );
  TestValidator.equals(
    "username unchanged",
    partialUpdate.username,
    initialProfile.username,
  );
  // 7. Verify updatedAt timestamp changed
  TestValidator.predicate(
    "updatedAt changed",
    partialUpdate.updatedAt !== initialProfile.updatedAt,
  );
}
