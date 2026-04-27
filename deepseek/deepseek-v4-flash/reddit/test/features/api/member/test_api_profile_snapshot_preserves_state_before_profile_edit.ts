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

/**
 * Test that profile snapshots preserve immutable records of profile state at the time of creation, even after the profile is subsequently edited.
 *
 * This validates the core business requirement of snapshots as append-only records. A member creates a snapshot of their profile, then edits their display name, biography, and avatar. A second snapshot is created capturing the new state. The first snapshot must retain the original pre-edit values — proving immutability.
 *
 * 1. Join as a new member via `authorize_member_join`.
 * 2. Update the profile to set known values for display_name, biography, and avatar_uri.
 * 3. Create Snapshot A and verify it captures the exact pre-edit profile state.
 * 4. Update the profile with different values for display_name, biography, and avatar_uri.
 * 5. Create Snapshot B and verify it captures the post-edit profile state.
 * 6. Re-verify Snapshot A still holds the original values — snapshots are immutable append-only records.
 * 7. Verify both snapshots reference the correct profile and member, with karma remaining 0.
 */
export async function test_api_profile_snapshot_preserves_state_before_profile_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Set initial profile to known deterministic values
  const initialDisplayName = RandomGenerator.name();
  const initialBiography = RandomGenerator.paragraph({ sentences: 2 });
  const initialAvatarUri = typia.random<string & tags.Format<"uri">>();
  const initialProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: initialDisplayName,
          biography: initialBiography,
          avatar_uri: initialAvatarUri,
        } satisfies ICommunityPlatformProfile.IUpdate,
      },
    );
  typia.assert(initialProfile);
  // 3. Create Snapshot A (captures pre-edit state)
  const snapshotA =
    await generate_random_community_platform_member_profile_snapshots_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(snapshotA);
  // 4. Verify Snapshot A captures the initial profile state
  TestValidator.equals(
    "snapshot A display_name matches pre-edit value",
    snapshotA.display_name,
    initialDisplayName,
  );
  TestValidator.equals(
    "snapshot A biography matches pre-edit value",
    snapshotA.biography,
    initialBiography,
  );
  TestValidator.equals(
    "snapshot A avatar matches pre-edit value",
    snapshotA.avatar,
    initialAvatarUri,
  );
  TestValidator.equals(
    "snapshot A karma is 0 (no votes cast)",
    snapshotA.karma,
    0,
  );
  // 5. Update profile with completely different values
  const updatedDisplayName = RandomGenerator.name();
  const updatedBiography = RandomGenerator.paragraph({ sentences: 2 });
  const updatedAvatarUri = typia.random<string & tags.Format<"uri">>();
  const updatedProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: updatedDisplayName,
          biography: updatedBiography,
          avatar_uri: updatedAvatarUri,
        } satisfies ICommunityPlatformProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 6. Create Snapshot B (captures post-edit state)
  const snapshotB =
    await generate_random_community_platform_member_profile_snapshots_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(snapshotB);
  // 7. Verify Snapshot A is immutable — still holds the original values
  TestValidator.equals(
    "snapshot A display_name unchanged after profile edit",
    snapshotA.display_name,
    initialDisplayName,
  );
  TestValidator.equals(
    "snapshot A biography unchanged after profile edit",
    snapshotA.biography,
    initialBiography,
  );
  TestValidator.equals(
    "snapshot A avatar unchanged after profile edit",
    snapshotA.avatar,
    initialAvatarUri,
  );
  TestValidator.equals(
    "snapshot A karma unchanged after profile edit (still 0)",
    snapshotA.karma,
    0,
  );
  // 8. Verify Snapshot B has the new post-edit values
  TestValidator.equals(
    "snapshot B display_name matches post-edit value",
    snapshotB.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "snapshot B biography matches post-edit value",
    snapshotB.biography,
    updatedBiography,
  );
  TestValidator.equals(
    "snapshot B avatar matches post-edit value",
    snapshotB.avatar,
    updatedAvatarUri,
  );
  TestValidator.equals(
    "snapshot B karma is 0 (no votes cast)",
    snapshotB.karma,
    0,
  );
  // 9. Verify both snapshots reference the correct profile and member
  TestValidator.equals(
    "snapshot A references correct profile id",
    snapshotA.profile.id,
    initialProfile.id,
  );
  TestValidator.equals(
    "snapshot B references correct profile id",
    snapshotB.profile.id,
    updatedProfile.id,
  );
  TestValidator.equals(
    "snapshot A references correct member id",
    snapshotA.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "snapshot B references correct member id",
    snapshotB.member.id,
    authorized.id,
  );
  // 10. Verify pre-edit and post-edit display names are different (edit actually occurred)
  TestValidator.notEquals(
    "display names differ before and after edit",
    initialDisplayName,
    updatedDisplayName,
  );
}
