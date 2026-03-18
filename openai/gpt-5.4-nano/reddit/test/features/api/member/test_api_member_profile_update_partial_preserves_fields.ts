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

export async function test_api_member_profile_update_partial_preserves_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAAuth);
  const memberAProfile =
    await generate_random_community_platform_member_profiles_create(
      memberAConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          avatar_uri: ("https://example.com/" +
            RandomGenerator.alphaNumeric(10) +
            ".png") as string & tags.Format<"uri">,
        } satisfies ICommunityPlatformUserProfile.ICreate,
      },
    );
  typia.assert(memberAProfile);
  const memberAProfileBefore1 = {
    display_name: memberAProfile.display_name,
    bio: memberAProfile.bio,
    avatar_uri: memberAProfile.avatar_uri,
    updated_at: memberAProfile.updated_at,
  };
  const newDisplayName = RandomGenerator.name();
  const updatedDisplayOnly =
    await api.functional.communityPlatform.profiles.update(memberAConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies ICommunityPlatformUserProfile.IUpdate,
    });
  typia.assert(updatedDisplayOnly);
  TestValidator.equals(
    "display_name updated",
    updatedDisplayOnly.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "bio preserved",
    updatedDisplayOnly.bio,
    memberAProfileBefore1.bio,
  );
  TestValidator.equals(
    "avatar_uri preserved",
    updatedDisplayOnly.avatar_uri,
    memberAProfileBefore1.avatar_uri,
  );
  TestValidator.predicate(
    "updated_at advanced",
    new Date(updatedDisplayOnly.updated_at).getTime() >
      new Date(memberAProfileBefore1.updated_at).getTime(),
  );
  const newBio1 = RandomGenerator.paragraph({ sentences: 3 });
  const updatedBioOnly = await api.functional.communityPlatform.profiles.update(
    memberAConnection,
    {
      body: { bio: newBio1 } satisfies ICommunityPlatformUserProfile.IUpdate,
    },
  );
  typia.assert(updatedBioOnly);
  TestValidator.equals("bio updated", updatedBioOnly.bio, newBio1);
  TestValidator.equals(
    "display_name preserved",
    updatedBioOnly.display_name,
    updatedDisplayOnly.display_name,
  );
  TestValidator.equals(
    "avatar_uri preserved",
    updatedBioOnly.avatar_uri,
    updatedDisplayOnly.avatar_uri,
  );
  TestValidator.predicate(
    "updated_at advanced again",
    new Date(updatedBioOnly.updated_at).getTime() >
      new Date(updatedDisplayOnly.updated_at).getTime(),
  );
  // 2) Edge: explicit null for bio; avatar_uri and display_name omitted
  const memberAProfileBefore2 = {
    display_name: updatedBioOnly.display_name,
    bio: updatedBioOnly.bio,
    avatar_uri: updatedBioOnly.avatar_uri,
    updated_at: updatedBioOnly.updated_at,
  };
  const updatedBioNull = await api.functional.communityPlatform.profiles.update(
    memberAConnection,
    {
      body: { bio: null } satisfies ICommunityPlatformUserProfile.IUpdate,
    },
  );
  typia.assert(updatedBioNull);
  TestValidator.equals("bio cleared to null", updatedBioNull.bio, null);
  TestValidator.equals(
    "avatar_uri unchanged",
    updatedBioNull.avatar_uri,
    memberAProfileBefore2.avatar_uri,
  );
  TestValidator.equals(
    "display_name unchanged",
    updatedBioNull.display_name,
    memberAProfileBefore2.display_name,
  );
  TestValidator.predicate(
    "updated_at advanced on null update",
    new Date(updatedBioNull.updated_at).getTime() >
      new Date(memberAProfileBefore2.updated_at).getTime(),
  );
  // 3) Concurrency/back-to-back updates for bio and avatar_uri
  const bioA = RandomGenerator.paragraph({ sentences: 2 });
  const avatarA = ("https://example.com/avatar/" +
    RandomGenerator.alphaNumeric(10) +
    ".png") as string & tags.Format<"uri">;
  const bioB = RandomGenerator.paragraph({ sentences: 2 });
  const avatarB = ("https://example.com/avatar/" +
    RandomGenerator.alphaNumeric(12) +
    ".png") as string & tags.Format<"uri">;
  const updatedABioAvatar =
    await api.functional.communityPlatform.profiles.update(memberAConnection, {
      body: {
        bio: bioA,
        avatar_uri: avatarA,
      } satisfies ICommunityPlatformUserProfile.IUpdate,
    });
  typia.assert(updatedABioAvatar);
  const updatedBBioAvatar =
    await api.functional.communityPlatform.profiles.update(memberAConnection, {
      body: {
        bio: bioB,
        avatar_uri: avatarB,
      } satisfies ICommunityPlatformUserProfile.IUpdate,
    });
  typia.assert(updatedBBioAvatar);
  TestValidator.equals("final bio matches B", updatedBBioAvatar.bio, bioB);
  TestValidator.equals(
    "final avatar_uri matches B",
    updatedBBioAvatar.avatar_uri,
    avatarB,
  );
  const profileFetched = await api.functional.communityPlatform.profiles.at(
    memberAConnection,
    { profileId: updatedBBioAvatar.id },
  );
  typia.assert(profileFetched);
  TestValidator.equals("persisted bio is B", profileFetched.bio, bioB);
  TestValidator.equals(
    "persisted avatar_uri is B",
    profileFetched.avatar_uri,
    avatarB,
  );
  TestValidator.predicate(
    "persisted updated_at corresponds to latest",
    new Date(profileFetched.updated_at).getTime() >=
      new Date(updatedBBioAvatar.updated_at).getTime(),
  );
  // 4) Ownership boundary: Member B must not affect Member A profile
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  // Create Member B's own profile, since PATCH /profiles updates currently logged-in member's profile
  const memberBProfile =
    await generate_random_community_platform_member_profiles_create(
      memberBConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          avatar_uri: ("https://example.com/memberB/" +
            RandomGenerator.alphaNumeric(10) +
            ".png") as string & tags.Format<"uri">,
        } satisfies ICommunityPlatformUserProfile.ICreate,
      },
    );
  typia.assert(memberBProfile);
  const memberAProfileIdToProtect = updatedBBioAvatar.id;
  const memberAProfileBeforeFail =
    await api.functional.communityPlatform.profiles.at(memberAConnection, {
      profileId: memberAProfileIdToProtect,
    });
  typia.assert(memberAProfileBeforeFail);
  const attackerBio = RandomGenerator.paragraph({ sentences: 2 });
  const attackerAvatar = ("https://example.com/attacker/" +
    RandomGenerator.alphaNumeric(10) +
    ".png") as string & tags.Format<"uri">;
  const updatedMemberB = await api.functional.communityPlatform.profiles.update(
    memberBConnection,
    {
      body: {
        bio: attackerBio,
        avatar_uri: attackerAvatar,
      } satisfies ICommunityPlatformUserProfile.IUpdate,
    },
  );
  typia.assert(updatedMemberB);
  // Member A profile must remain unchanged
  const memberAProfileAfterFail =
    await api.functional.communityPlatform.profiles.at(memberAConnection, {
      profileId: memberAProfileIdToProtect,
    });
  typia.assert(memberAProfileAfterFail);
  TestValidator.equals(
    "member A bio unchanged",
    memberAProfileAfterFail.bio,
    memberAProfileBeforeFail.bio,
  );
  TestValidator.equals(
    "member A avatar_uri unchanged",
    memberAProfileAfterFail.avatar_uri,
    memberAProfileBeforeFail.avatar_uri,
  );
}
