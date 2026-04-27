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

export async function test_api_profile_snapshot_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member operations
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Join as a member — creates member account with initial profile
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const profile = authorized.profile;
  // 2. Create a profile snapshot capturing the current profile state
  const snapshot =
    await generate_random_community_platform_member_profile_snapshots_create(
      memberConnection,
      {},
    );
  typia.assert(snapshot);
  // 3. Validate snapshot scalar fields match the current profile
  TestValidator.equals(
    "display_name matches current profile",
    snapshot.display_name,
    profile.display_name,
  );
  TestValidator.equals(
    "biography matches current profile",
    snapshot.biography,
    profile.biography,
  );
  TestValidator.equals(
    "avatar matches current profile",
    snapshot.avatar,
    profile.avatar_uri,
  );
  TestValidator.equals(
    "karma matches current profile",
    snapshot.karma,
    profile.karma,
  );
  // 4. Validate profile reference (ICommunityPlatformProfile.ISummary)
  TestValidator.equals("profile summary id", snapshot.profile.id, profile.id);
  TestValidator.equals(
    "profile summary display_name",
    snapshot.profile.display_name,
    profile.display_name,
  );
  TestValidator.equals(
    "profile summary avatar",
    snapshot.profile.avatar_uri,
    profile.avatar_uri,
  );
  TestValidator.equals(
    "profile summary karma",
    snapshot.profile.karma,
    profile.karma,
  );
  // 5. Validate member reference (ICommunityPlatformMember.ISummary)
  TestValidator.equals("member summary id", snapshot.member.id, authorized.id);
  TestValidator.equals(
    "member summary email",
    snapshot.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member summary username",
    snapshot.member.username,
    authorized.username,
  );
}
