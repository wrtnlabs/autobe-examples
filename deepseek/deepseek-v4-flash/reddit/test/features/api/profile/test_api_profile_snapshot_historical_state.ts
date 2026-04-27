import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_profile_snapshots_create } from "../../../generate/generate_random_community_platform_member_profile_snapshots_create";
import { prepare_random_community_platform_profile_snapshot } from "../../../prepare/prepare_random_community_platform_profile_snapshot";

export async function test_api_profile_snapshot_historical_state(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const initialDisplayName = authorized.profile.display_name;
  // Step 2: Create snapshot S1 (captures initial pre-update state)
  const s1 =
    await generate_random_community_platform_member_profile_snapshots_create(
      memberConnection,
      {},
    );
  typia.assert(s1);
  // Step 3: Update the member's profile with new values
  const newDisplayName = typia.random<string & tags.MinLength<1>>();
  const newBio = RandomGenerator.paragraph({ sentences: 1 });
  const newAvatar = typia.random<string & tags.Format<"uri">>();
  const updatedProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: newDisplayName,
          biography: newBio,
          avatar_uri: newAvatar,
        } satisfies ICommunityPlatformProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Step 4: Create snapshot S2 (captures post-update state)
  const s2 =
    await generate_random_community_platform_member_profile_snapshots_create(
      memberConnection,
      {},
    );
  typia.assert(s2);
  // Step 5: Retrieve S1 and verify pre-update state is preserved
  const snapshot1 =
    await api.functional.communityPlatform.member.profile.snapshots.at(
      memberConnection,
      { snapshotId: s1.id },
    );
  typia.assert(snapshot1);
  TestValidator.equals(
    "S1 display_name is initial value",
    snapshot1.display_name,
    initialDisplayName,
  );
  TestValidator.equals("S1 biography is null", snapshot1.biography, null);
  TestValidator.equals("S1 avatar is null", snapshot1.avatar, null);
  TestValidator.equals("S1 karma is 0", snapshot1.karma, 0);
  // Step 6: Retrieve S2 and verify post-update state is captured
  const snapshot2 =
    await api.functional.communityPlatform.member.profile.snapshots.at(
      memberConnection,
      { snapshotId: s2.id },
    );
  typia.assert(snapshot2);
  TestValidator.equals(
    "S2 display_name is updated value",
    snapshot2.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "S2 biography is updated value",
    snapshot2.biography,
    newBio,
  );
  TestValidator.equals(
    "S2 avatar is updated value",
    snapshot2.avatar,
    newAvatar,
  );
  TestValidator.equals("S2 karma is 0", snapshot2.karma, 0);
  // Step 7: Verify both snapshots reference the same profile
  TestValidator.equals(
    "Same profile id in both snapshots",
    snapshot1.profile.id,
    snapshot2.profile.id,
  );
  // Step 8: Verify both snapshots reference the same member
  TestValidator.equals(
    "Same member id in both snapshots",
    snapshot1.member.id,
    snapshot2.member.id,
  );
  // Step 9: Verify S1.created_at precedes S2.created_at
  TestValidator.predicate(
    "S1 created_at precedes S2 created_at",
    new Date(snapshot1.created_at).getTime() <
      new Date(snapshot2.created_at).getTime(),
  );
}
