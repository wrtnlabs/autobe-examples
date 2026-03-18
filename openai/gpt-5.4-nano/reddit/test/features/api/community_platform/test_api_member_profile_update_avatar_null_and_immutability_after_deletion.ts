import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_profiles_create } from "../../../generate/generate_random_community_platform_member_profiles_create";
import { prepare_random_community_platform_user_profile } from "../../../prepare/prepare_random_community_platform_user_profile";

export async function test_api_member_profile_update_avatar_null_and_immutability_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const avatarUri = typia.random<string & tags.Format<"uri">>();
  const initialDisplayName = RandomGenerator.name();
  const initialBio = RandomGenerator.paragraph({ sentences: 2 });
  const initialProfile =
    await generate_random_community_platform_member_profiles_create(
      memberConnection,
      {
        body: {
          display_name: initialDisplayName,
          bio: initialBio,
          avatar_uri: avatarUri,
        } satisfies ICommunityPlatformUserProfile.ICreate,
      },
    );
  typia.assert(initialProfile);
  const initialUpdatedAt = initialProfile.updated_at;
  const patched1 = await api.functional.communityPlatform.profiles.update(
    memberConnection,
    {
      body: {
        avatar_uri: null,
      } satisfies ICommunityPlatformUserProfile.IUpdate,
    },
  );
  typia.assert(patched1);
  TestValidator.equals(
    "display_name should remain unchanged",
    patched1.display_name,
    initialProfile.display_name,
  );
  TestValidator.equals(
    "bio should remain unchanged",
    patched1.bio,
    initialProfile.bio,
  );
  TestValidator.equals(
    "avatar_uri should become null",
    patched1.avatar_uri,
    null,
  );
  TestValidator.predicate(
    "updated_at should advance",
    patched1.updated_at !== initialUpdatedAt,
  );
  const newDisplayName = RandomGenerator.name();
  const patched2 = await api.functional.communityPlatform.profiles.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ICommunityPlatformUserProfile.IUpdate,
    },
  );
  typia.assert(patched2);
  TestValidator.equals(
    "display_name should update",
    patched2.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "bio should remain unchanged",
    patched2.bio,
    initialProfile.bio,
  );
  TestValidator.equals(
    "avatar_uri should remain null when omitted",
    patched2.avatar_uri,
    null,
  );
  TestValidator.predicate(
    "updated_at should advance again",
    patched2.updated_at !== patched1.updated_at,
  );
}
