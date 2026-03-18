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

export async function test_api_user_profile_create_success_complete(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 1 });
  const avatarUri = `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}`;
  const created =
    await generate_random_community_platform_member_profiles_create(
      memberConnection,
      {
        body: {
          display_name: displayName,
          bio,
          avatar_uri: avatarUri,
        } satisfies ICommunityPlatformUserProfile.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "display_name matches submitted",
    created.display_name,
    displayName,
  );
  TestValidator.equals("bio matches submitted", created.bio, bio);
  TestValidator.equals(
    "avatar_uri matches submitted",
    created.avatar_uri,
    avatarUri,
  );
  TestValidator.equals("deleted_at is null", created.deleted_at, null);
  TestValidator.equals(
    "community_platform_member_id matches authenticated member",
    created.community_platform_member_id,
    authorized.id,
  );
  TestValidator.equals(
    "member.id matches authenticated member",
    created.member.id,
    authorized.id,
  );
}
