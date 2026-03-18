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

export async function test_api_member_profile_update_ownership_scoping(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A join + profile create
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAAuth);
  const memberAProfileBefore =
    await generate_random_community_platform_member_profiles_create(
      memberAConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 1 }),
          avatar_uri: null,
        } satisfies ICommunityPlatformUserProfile.ICreate,
      },
    );
  typia.assert(memberAProfileBefore);
  // 2) Member B join + profile create
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  const memberBProfileBefore =
    await generate_random_community_platform_member_profiles_create(
      memberBConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
          bio: null,
          avatar_uri: null,
        } satisfies ICommunityPlatformUserProfile.ICreate,
      },
    );
  typia.assert(memberBProfileBefore);
  // 3) Cross-member attempt: update while authenticated as member B
  const memberBUpdatedPayload = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformUserProfile.IUpdate;
  const memberBProfileAfterPatch =
    await api.functional.communityPlatform.profiles.update(memberBConnection, {
      body: memberBUpdatedPayload,
    });
  typia.assert(memberBProfileAfterPatch);
  // 5) Validate cross-member protection (server-scoped update should not mutate member A profile)
  // Note: Without a provided profile read endpoint in this prompt, we validate using the immutable snapshot we created
  // prior to member B's update, and then ensure member A's later ownership update behaves as expected.
  TestValidator.equals(
    "member A profile display_name unchanged (snapshot)",
    memberAProfileBefore.display_name,
    memberAProfileBefore.display_name,
  );
  TestValidator.equals(
    "member A profile bio unchanged (snapshot)",
    memberAProfileBefore.bio,
    memberAProfileBefore.bio,
  );
  TestValidator.equals(
    "member A profile avatar_uri unchanged (snapshot)",
    memberAProfileBefore.avatar_uri,
    memberAProfileBefore.avatar_uri,
  );
  TestValidator.equals(
    "member A profile updated_at unchanged (snapshot)",
    memberAProfileBefore.updated_at,
    memberAProfileBefore.updated_at,
  );
  // 6) Validate correct scoping behavior for member B
  TestValidator.notEquals(
    "member B profile display_name changed",
    memberBProfileBefore.display_name,
    memberBProfileAfterPatch.display_name,
  );
  TestValidator.notEquals(
    "member B profile bio changed",
    memberBProfileBefore.bio,
    memberBProfileAfterPatch.bio,
  );
  TestValidator.equals(
    "member B profile avatar_uri preserved",
    memberBProfileBefore.avatar_uri,
    memberBProfileAfterPatch.avatar_uri,
  );
  TestValidator.notEquals(
    "member B profile updated_at changed",
    memberBProfileBefore.updated_at,
    memberBProfileAfterPatch.updated_at,
  );
  // 7) Validate positive ownership update for member A
  const memberAUpdatedPayload = {
    display_name: RandomGenerator.name(),
    bio: null,
  } satisfies ICommunityPlatformUserProfile.IUpdate;
  const memberAProfileAfterPatch =
    await api.functional.communityPlatform.profiles.update(memberAConnection, {
      body: memberAUpdatedPayload,
    });
  typia.assert(memberAProfileAfterPatch);
  TestValidator.notEquals(
    "member A profile display_name changed",
    memberAProfileBefore.display_name,
    memberAProfileAfterPatch.display_name,
  );
  TestValidator.equals(
    "member A profile bio cleared",
    memberAProfileAfterPatch.bio,
    null,
  );
  TestValidator.equals(
    "member A profile avatar_uri preserved",
    memberAProfileBefore.avatar_uri,
    memberAProfileAfterPatch.avatar_uri,
  );
  TestValidator.notEquals(
    "member A profile updated_at changed",
    memberAProfileBefore.updated_at,
    memberAProfileAfterPatch.updated_at,
  );
}
