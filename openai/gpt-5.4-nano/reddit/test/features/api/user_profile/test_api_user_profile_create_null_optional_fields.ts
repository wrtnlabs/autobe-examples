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

export async function test_api_user_profile_create_null_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    ...authorizedConnection.headers,
    Authorization: memberAuthorized.token.access,
  };
  const displayName = RandomGenerator.name();
  const body = {
    display_name: displayName,
    bio: null,
    avatar_uri: null,
  } satisfies ICommunityPlatformUserProfile.ICreate;
  const profile = await api.functional.communityPlatform.member.profiles.create(
    authorizedConnection,
    {
      body,
    },
  );
  typia.assert(profile);
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    displayName,
  );
  TestValidator.equals("bio is null", profile.bio, null);
  TestValidator.equals("avatar_uri is null", profile.avatar_uri, null);
  TestValidator.equals("deleted_at is null", profile.deleted_at, null);
  TestValidator.predicate(
    "created_at is present",
    () =>
      profile.created_at !==
      (undefined as unknown as typeof profile.created_at),
  );
  TestValidator.predicate(
    "updated_at is present",
    () =>
      profile.updated_at !==
      (undefined as unknown as typeof profile.updated_at),
  );
}
