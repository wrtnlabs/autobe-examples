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

export async function test_api_profile_snapshot_browse_filtered_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Join as a new member
  //----
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  //----
  // 2. Capture timestamp t1 before creating any snapshots
  //----
  const t1: string = new Date().toISOString();
  //----
  // 3. Create snapshot #1
  //----
  const snapshot1 =
    await generate_random_community_platform_member_profile_snapshots_create(
      memberConnection,
      {},
    );
  //----
  // 4. Update the profile (change display_name)
  //----
  const updatedProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: `Updated_${RandomGenerator.alphabets(8)}`,
        } satisfies ICommunityPlatformProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  //----
  // 5. Create snapshot #2
  //----
  const snapshot2 =
    await generate_random_community_platform_member_profile_snapshots_create(
      memberConnection,
      {},
    );
  //----
  // 6. Capture timestamp t2 after both snapshots
  //----
  const t2: string = new Date().toISOString();
  //----
  // 7. Browse with date range [t1, t2) — should return both snapshots
  //----
  const bothSnapshots =
    await api.functional.communityPlatform.member.profile.snapshots.index(
      memberConnection,
      {
        body: {
          memberId: authorized.id,
          from: t1,
          to: t2,
        } satisfies ICommunityPlatformProfileSnapshot.IRequest,
      },
    );
  typia.assert(bothSnapshots);
  TestValidator.equals(
    "both snapshots returned in date range",
    bothSnapshots.data.length,
    2,
  );
  //----
  // 8. Browse with narrow window (just after snapshot1, just before snapshot2)
  //    — should return empty (no snapshots created in the gap)
  //----
  const afterSnapshot1 = new Date(
    new Date(snapshot1.created_at).getTime() + 1,
  ).toISOString();
  const beforeSnapshot2 = new Date(
    new Date(snapshot2.created_at).getTime() - 1,
  ).toISOString();
  const emptyResult =
    await api.functional.communityPlatform.member.profile.snapshots.index(
      memberConnection,
      {
        body: {
          memberId: authorized.id,
          from: afterSnapshot1,
          to: beforeSnapshot2,
        } satisfies ICommunityPlatformProfileSnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "no snapshots in narrow window between snapshots",
    emptyResult.data.length,
    0,
  );
  //----
  // 9. Browse with from only (just after snapshot1, no to)
  //    — should return only snapshot #2
  //----
  const onlySnapshot2Result =
    await api.functional.communityPlatform.member.profile.snapshots.index(
      memberConnection,
      {
        body: {
          memberId: authorized.id,
          from: afterSnapshot1,
        } satisfies ICommunityPlatformProfileSnapshot.IRequest,
      },
    );
  typia.assert(onlySnapshot2Result);
  TestValidator.equals(
    "only snapshot #2 returned with from-only filter",
    onlySnapshot2Result.data.length,
    1,
  );
  TestValidator.equals(
    "returned snapshot id matches snapshot #2",
    onlySnapshot2Result.data[0].id,
    snapshot2.id,
  );
}
