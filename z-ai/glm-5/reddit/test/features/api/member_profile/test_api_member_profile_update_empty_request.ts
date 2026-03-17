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

export async function test_api_member_profile_update_empty_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Set initial profile values to establish a known state
  const initialDisplayName = RandomGenerator.name(2);
  const initialBio = RandomGenerator.paragraph({ sentences: 3 });
  const initialProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: initialDisplayName,
          bio: initialBio,
        } satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  typia.assert(initialProfile);
  // 3. Call profile update with empty request body
  const updatedProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {} satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Verify profile values remain unchanged
  TestValidator.equals(
    "display_name unchanged",
    updatedProfile.displayName,
    initialDisplayName,
  );
  TestValidator.equals("bio unchanged", updatedProfile.bio, initialBio);
  TestValidator.equals(
    "username unchanged",
    updatedProfile.username,
    member.username,
  );
  TestValidator.equals("karma unchanged", updatedProfile.karma, member.karma);
}
