import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
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

export async function test_api_member_directory_missing_profile_still_returns_member_summary_fallbacks(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins and creates a profile
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
          avatar_uri: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformUserProfile.ICreate,
      },
    );
  typia.assert(memberAProfile);
  // 2) Member B joins and then deletes its profile
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  // Ensure a profile exists to delete (erase requires authenticated profile context)
  await generate_random_community_platform_member_profiles_create(
    memberBConnection,
    {
      body: {
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
        avatar_uri: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformUserProfile.ICreate,
    },
  );
  await api.functional.communityPlatform.member.profile.erase(
    memberBConnection,
  );
  // 3) Member A calls member directory listing (authenticated member-only endpoint)
  const directory = await api.functional.communityPlatform.member.members.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(directory);
  // 4) Validate presence and privacy fields
  const memberSummaries = directory.data;
  const memberAFromList = memberSummaries.find((m) => m.id === memberAAuth.id);
  const memberBFromList = memberSummaries.find((m) => m.id === memberBAuth.id);
  TestValidator.predicate(
    "member A should be included in directory response",
    () => memberAFromList !== undefined,
  );
  TestValidator.predicate(
    "member B should be included in directory response",
    () => memberBFromList !== undefined,
  );
  if (memberAFromList === undefined || memberBFromList === undefined) {
    throw new Error("Missing expected members in directory response");
  }
  TestValidator.equals(
    "privacy: id matches",
    memberAFromList.id,
    memberAAuth.id,
  );
  TestValidator.equals(
    "member A display_name matches profile display_name",
    memberAFromList.display_name,
    memberAProfile.display_name,
  );
  // For Member A, persona fields can be null, but when they were set they should be preserved.
  TestValidator.equals(
    "member A bio matches profile bio",
    memberAFromList.bio,
    memberAProfile.bio,
  );
  TestValidator.equals(
    "member A avatar_uri matches profile avatar_uri",
    memberAFromList.avatar_uri,
    memberAProfile.avatar_uri,
  );
  // Member B profile was deleted -> directory should still include member with fallback display_name
  TestValidator.predicate(
    "member B display_name is non-null string",
    () => memberBFromList.display_name.trim().length > 0,
  );
  TestValidator.equals(
    "member B bio falls back to null",
    memberBFromList.bio,
    null,
  );
  TestValidator.equals(
    "member B avatar_uri falls back to null",
    memberBFromList.avatar_uri,
    null,
  );
  // 5) Ensure no sensitive fields are exposed: DTO contract only includes id/display_name/bio/avatar_uri
  const allowedKeys = new Set(["id", "display_name", "bio", "avatar_uri"]);
  for (const summary of memberSummaries) {
    for (const key of Object.keys(summary)) {
      TestValidator.predicate(
        `privacy: ${key} must not be exposed in summary DTO`,
        () => allowedKeys.has(key),
      );
    }
  }
}
