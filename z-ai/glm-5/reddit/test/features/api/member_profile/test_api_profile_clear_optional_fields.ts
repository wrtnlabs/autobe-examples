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

export async function test_api_profile_clear_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatarUrl: "https://example.com/avatar.png",
    },
  });
  typia.assert(authorized);
  const memberId = authorized.id;
  const memberKarma = authorized.karma;
  // 2. Set initial profile with bio and avatar_url
  const initialProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: authorized.displayName,
          bio: "Initial bio text for testing",
          avatar_url: "https://example.com/initial-avatar.png",
        } satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  typia.assert(initialProfile);
  TestValidator.equals("member ID unchanged", initialProfile.id, memberId);
  TestValidator.equals(
    "initial bio set",
    initialProfile.bio,
    "Initial bio text for testing",
  );
  TestValidator.equals(
    "initial avatar set",
    initialProfile.avatarUrl,
    "https://example.com/initial-avatar.png",
  );
  TestValidator.equals("karma unchanged", initialProfile.karma, memberKarma);
  // 3. Clear bio by providing null
  const profileWithClearedBio =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: authorized.displayName,
          bio: null,
        } satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  typia.assert(profileWithClearedBio);
  TestValidator.equals("bio cleared to null", profileWithClearedBio.bio, null);
  TestValidator.equals(
    "avatar still present after bio clear",
    profileWithClearedBio.avatarUrl,
    "https://example.com/initial-avatar.png",
  );
  TestValidator.equals(
    "karma unchanged after bio clear",
    profileWithClearedBio.karma,
    memberKarma,
  );
  TestValidator.equals(
    "member ID unchanged after bio clear",
    profileWithClearedBio.id,
    memberId,
  );
  // 4. Clear avatar_url by providing null
  const profileWithClearedAvatar =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: authorized.displayName,
          avatar_url: null,
        } satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  typia.assert(profileWithClearedAvatar);
  TestValidator.equals(
    "avatar cleared to null",
    profileWithClearedAvatar.avatarUrl,
    null,
  );
  TestValidator.equals(
    "bio still null after avatar clear",
    profileWithClearedAvatar.bio,
    null,
  );
  TestValidator.equals(
    "karma unchanged after avatar clear",
    profileWithClearedAvatar.karma,
    memberKarma,
  );
  TestValidator.equals(
    "member ID unchanged after avatar clear",
    profileWithClearedAvatar.id,
    memberId,
  );
  // 5. Verify display_name is always required and present
  TestValidator.predicate(
    "display name present",
    profileWithClearedAvatar.displayName.length > 0,
  );
}
