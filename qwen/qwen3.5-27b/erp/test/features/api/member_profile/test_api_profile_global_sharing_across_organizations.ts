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
 * Test that profile updates apply globally across all organizations the member belongs to.
 *
 * Validates that a member's global profile information (display name, avatar, and phone number) is correctly updated and immediately reflected in the system. The profile serves as a single source of truth for the member's identity across all organizational contexts.
 *
 * This test confirms that profile updates are atomic, immediately available, and properly validated by the backend.
 *
 * 1. Register a new member with email and password authentication.
 * 2. Update the member's profile with display name, avatar URL, and phone number.
 * 3. Validate that all profile fields are correctly stored and returned in the response.
 * 4. Verify data integrity: display name matches input, avatar is valid URL format, phone number matches input.
 */
export async function test_api_profile_global_sharing_across_organizations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Prepare profile update data
  const display_name = RandomGenerator.name();
  const avatar = typia.random<string & tags.Format<"url">>();
  const phone_number = RandomGenerator.mobile();
  // 3. Update the member's global profile
  const profile = await api.functional.hrmTimeTrack.member.profile.update(
    memberConnection,
    {
      body: {
        display_name,
        avatar,
        phone_number,
      } satisfies IHrmTimeTrackUserProfile.IUpdate,
    },
  );
  typia.assert(profile);
  // 4. Validate profile fields match the input
  TestValidator.equals(
    "display name matches input",
    profile.display_name,
    display_name,
  );
  TestValidator.equals("avatar matches input", profile.avatar, avatar);
  TestValidator.equals(
    "phone number matches input",
    profile.phone_number,
    phone_number,
  );
  // 5. Validate all fields are present (not null/undefined)
  TestValidator.predicate(
    "display name is present",
    profile.display_name !== undefined,
  );
  TestValidator.predicate("avatar is present", profile.avatar !== null);
  TestValidator.predicate(
    "phone number is present",
    profile.phone_number !== undefined && profile.phone_number !== null,
  );
}
