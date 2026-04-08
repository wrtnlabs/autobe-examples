import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member can successfully update their global profile information including display name, avatar URL, and phone number.
 *
 * Validates the complete profile update workflow for authenticated members. The test ensures that all three updatable profile fields (display_name, avatar, phone_number) can be modified in a single request and that the response contains the complete updated profile entity with all current attribute values.
 *
 * Special attention is given to verifying that the returned profile reflects the exact values provided in the update request, confirming that the profile update operation correctly persists and returns the modified data.
 *
 * 1. Member authenticates via registration with email and password.
 * 2. Member updates their profile with new display name, avatar URL, and phone number.
 * 3. Validates that the response contains the complete updated profile entity.
 * 4. Verifies that all three profile fields match the input values exactly.
 */
export async function test_api_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Generate profile update data
  const displayName = RandomGenerator.name();
  const avatarUrl = typia.random<string & tags.Format<"url">>();
  const phoneNumber = RandomGenerator.mobile();
  // 3. Update profile with all three fields
  const profile = await api.functional.hrmTimeTrack.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: displayName,
        avatar: avatarUrl,
        phone_number: phoneNumber,
      } satisfies IHrmTimeTrackUserProfile.IUpdate,
    },
  );
  typia.assert(profile);
  // 4. Validate that response matches input values
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    displayName,
  );
  TestValidator.equals("avatar matches", profile.avatar, avatarUrl);
  TestValidator.equals(
    "phone_number matches",
    profile.phone_number,
    phoneNumber,
  );
}
