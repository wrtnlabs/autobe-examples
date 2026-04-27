import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileSnapshot";
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

export async function test_api_profile_snapshot_browse_with_profile_updates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {});
  typia.assert(joined);
  const initialProfile = joined.profile;
  // 2. Create snapshot #1 — captures initial profile state
  const snapshot1 =
    await generate_random_community_platform_member_profile_snapshots_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(snapshot1);
  // 3. Update profile — set display_name, biography, and avatar_uri
  const updatedDisplayName = RandomGenerator.name();
  const updatedBio = RandomGenerator.paragraph({ sentences: 2 });
  const updatedAvatar = typia.random<string & tags.Format<"uri">>();
  const updatedProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: updatedDisplayName,
          biography: updatedBio,
          avatar_uri: updatedAvatar,
        } satisfies ICommunityPlatformProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Create snapshot #2 — captures updated profile state
  const snapshot2 =
    await generate_random_community_platform_member_profile_snapshots_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(snapshot2);
  // 5. Browse snapshot history via PATCH index endpoint
  const page =
    await api.functional.communityPlatform.member.profile.snapshots.index(
      memberConnection,
      {
        body: {
          memberId: joined.id,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformProfileSnapshot.IRequest,
      },
    );
  typia.assert(page);
  // 6. Verify pagination metadata
  TestValidator.equals("pagination records", page.pagination.records, 2);
  TestValidator.equals("pagination pages", page.pagination.pages, 1);
  TestValidator.equals("pagination current", page.pagination.current, 1);
  // 7. Verify snapshot count
  TestValidator.equals("two snapshots returned", page.data.length, 2);
  // 8. Verify reverse chronological order — most recent first
  const firstSnapshot: ICommunityPlatformProfileSnapshot.ISummary =
    page.data[0];
  const secondSnapshot: ICommunityPlatformProfileSnapshot.ISummary =
    page.data[1];
  TestValidator.predicate(
    "snapshots ordered by created_at descending",
    new Date(firstSnapshot.created_at).getTime() >
      new Date(secondSnapshot.created_at).getTime(),
  );
  // 9. Verify snapshot #2 (first in list) has updated profile values
  TestValidator.equals(
    "snapshot2 display_name",
    firstSnapshot.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "snapshot2 biography",
    firstSnapshot.biography,
    updatedBio,
  );
  TestValidator.equals("snapshot2 avatar", firstSnapshot.avatar, updatedAvatar);
  // 10. Verify snapshot #1 (second in list) has initial profile values
  TestValidator.equals(
    "snapshot1 display_name",
    secondSnapshot.display_name,
    initialProfile.display_name,
  );
  TestValidator.equals(
    "snapshot1 biography is null",
    secondSnapshot.biography,
    null,
  );
  TestValidator.equals("snapshot1 avatar is null", secondSnapshot.avatar, null);
  TestValidator.equals("snapshot1 karma is 0", secondSnapshot.karma, 0);
}
