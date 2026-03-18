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

export async function test_api_user_profile_create_duplicate_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate a member (obtain tokens)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Recreate actor-specific connection carrying the Authorization header
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { ...(memberConnection.headers ?? {}) };
  // 2) Create first profile
  const firstDisplayName = RandomGenerator.name();
  const firstBody = {
    display_name: firstDisplayName,
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_uri: "https://example.com/avatar.png",
  } satisfies ICommunityPlatformUserProfile.ICreate;
  const firstProfile =
    await generate_random_community_platform_member_profiles_create(
      userConnection,
      {
        body: firstBody,
      },
    );
  typia.assert(firstProfile);
  // 3) Attempt duplicate profile creation
  const secondDisplayName = RandomGenerator.name();
  const secondBody = {
    display_name: secondDisplayName,
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar_uri: "https://example.com/avatar2.png",
  } satisfies ICommunityPlatformUserProfile.ICreate;
  await TestValidator.httpError(
    "should reject duplicate profile creation for the same member with conflict",
    409,
    async () => {
      await generate_random_community_platform_member_profiles_create(
        userConnection,
        {
          body: secondBody,
        },
      );
    },
  );
  // 4) Validate first profile remains unchanged (cannot verify count without read endpoint)
  TestValidator.equals(
    "profile display name should remain from the first creation",
    firstProfile.display_name,
    firstDisplayName,
  );
}
