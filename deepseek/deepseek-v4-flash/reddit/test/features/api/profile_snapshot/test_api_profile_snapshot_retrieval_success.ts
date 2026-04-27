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
 * Test successful retrieval of a member's profile snapshot by its unique identifier.
 *
 * Validates the complete lifecycle of a profile snapshot: creation by the authenticated member and subsequent retrieval by snapshot ID. Verifies that all captured profile fields (display name, biography, avatar, karma) match exactly between the creation response and the retrieval response.
 *
 * Special attention is given to validating the nested profile summary (display name, avatar URI, karma) and member summary (ID, email, username) within the snapshot object, ensuring cross-references are correctly resolved.
 *
 * 1. Member joins the platform with unique credentials.
 * 2. Member creates a profile snapshot capturing current profile state.
 * 3. Member retrieves the snapshot by its UUID.
 * 4. Validates snapshot fields match the creation response.
 * 5. Validates nested profile and member summaries resolve correctly.
 */
export async function test_api_profile_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Join as a member
  //----
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = `test_retrieval_${RandomGenerator.alphaNumeric(6)}`;
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email,
      username,
    },
  });
  typia.assert(joinResult);
  //----
  // 2. Create a profile snapshot
  //----
  const snapshot =
    await generate_random_community_platform_member_profile_snapshots_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(snapshot);
  //----
  // 3. Retrieve the snapshot by its id
  //----
  const retrieved =
    await api.functional.communityPlatform.member.profile.snapshots.at(
      memberConnection,
      { snapshotId: snapshot.id },
    );
  typia.assert(retrieved);
  //----
  // 4. Validate snapshot identity fields
  //----
  TestValidator.equals(
    "snapshot id matches path parameter",
    retrieved.id,
    snapshot.id,
  );
  //----
  // 5. Validate captured profile fields
  //----
  TestValidator.equals(
    "display_name matches creation",
    retrieved.display_name,
    snapshot.display_name,
  );
  TestValidator.equals(
    "biography matches creation",
    retrieved.biography,
    snapshot.biography,
  );
  TestValidator.equals(
    "avatar matches creation",
    retrieved.avatar,
    snapshot.avatar,
  );
  TestValidator.equals(
    "karma matches creation",
    retrieved.karma,
    snapshot.karma,
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    () => !isNaN(new Date(retrieved.created_at).getTime()),
  );
  TestValidator.predicate(
    "created_at is not in the future",
    () => new Date(retrieved.created_at).getTime() <= Date.now(),
  );
  //----
  // 6. Validate nested profile summary (ICommunityPlatformProfile.ISummary)
  //----
  TestValidator.equals(
    "profile.id matches",
    retrieved.profile.id,
    snapshot.profile.id,
  );
  TestValidator.equals(
    "profile.display_name matches",
    retrieved.profile.display_name,
    snapshot.profile.display_name,
  );
  TestValidator.equals(
    "profile.avatar_uri matches",
    retrieved.profile.avatar_uri,
    snapshot.profile.avatar_uri,
  );
  TestValidator.equals(
    "profile.karma matches",
    retrieved.profile.karma,
    snapshot.profile.karma,
  );
  TestValidator.equals(
    "profile.member.id matches",
    retrieved.profile.member.id,
    snapshot.profile.member.id,
  );
  TestValidator.equals(
    "profile.member.email matches",
    retrieved.profile.member.email,
    snapshot.profile.member.email,
  );
  TestValidator.equals(
    "profile.member.username matches",
    retrieved.profile.member.username,
    snapshot.profile.member.username,
  );
  //----
  // 7. Validate nested member summary (ICommunityPlatformMember.ISummary)
  //----
  TestValidator.equals(
    "member.id matches authenticated member",
    retrieved.member.id,
    joinResult.id,
  );
  TestValidator.equals(
    "member.email matches join email",
    retrieved.member.email,
    joinResult.email,
  );
  TestValidator.equals(
    "member.username matches join username",
    retrieved.member.username,
    joinResult.username,
  );
}
