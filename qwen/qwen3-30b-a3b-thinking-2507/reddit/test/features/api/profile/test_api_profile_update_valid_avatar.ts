import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_valid_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityPlatformMember.IJoin,
  });
  // 2. Create profile update request
  const avatarUrl = typia.random<string & tags.Format<"uri">>();
  // 3. Update profile with valid avatar URL
  const profile = await api.functional.communityPlatform.member.profile.update(
    memberConnection,
    {
      body: {
        avatar_url:
          avatarUrl satisfies ICommunityPlatformProfile.IUpdate["avatar_url"],
      } satisfies ICommunityPlatformProfile.IUpdate,
    },
  );
  typia.assert(profile);
  // 4. Validate result
  TestValidator.equals(
    "avatar URL matches input",
    profile.avatar_url,
    avatarUrl,
  );
}
