import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_profile_snapshot } from "../prepare/prepare_random_community_platform_profile_snapshot";

/**
 * Generate a random profile snapshot for the authenticated member for E2E testing.
 *
 * Creates a point-in-time snapshot of the member's current profile state by calling the snapshot creation API.
 * The snapshot captures the member's display name, biography, avatar URI, and karma score as they exist at
 * the moment of creation. Since all snapshot data is automatically derived from the member's current profile,
 * the request body is empty — no input fields are required from the caller.
 *
 * The resulting snapshot is an immutable, append-only record that preserves the profile state for audit trail,
 * rollback, and data recovery purposes within the platform's retention period.
 */
export async function generate_random_community_platform_member_profile_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformProfileSnapshot.ICreate> | undefined;
  },
): Promise<ICommunityPlatformProfileSnapshot> {
  const prepared: ICommunityPlatformProfileSnapshot.ICreate =
    prepare_random_community_platform_profile_snapshot(props.body);
  const result: ICommunityPlatformProfileSnapshot =
    await api.functional.communityPlatform.member.profile.snapshots.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
