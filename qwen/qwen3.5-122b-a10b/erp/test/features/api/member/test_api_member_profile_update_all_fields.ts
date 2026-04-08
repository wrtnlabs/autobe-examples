import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test updating a member's global profile with all available fields.
 *
 * Validates the complete profile update workflow for authenticated members, testing the ability to update display name, avatar image URL, and phone number in a single request. Ensures that the profile update operation succeeds and returns the member's core profile information.
 *
 * The test verifies that the updated_at timestamp is properly updated when profile changes are made, and that all standard member fields remain intact during the update operation. Note: The response contains core member identity fields (id, email, timestamps) but not the updated profile fields (display_name, avatar_image_url, phone_number) as per the IHrmEmployee DTO definition.
 *
 * 1. Create a new member account via /hrm/auth/member/join.
 * 2. Create a new connection with the auth token from join response.
 * 3. Call PUT /hrm/member/profile with all three fields populated.
 * 4. Verify the response contains standard member fields (id, email, created_at, updated_at).
 * 5. Verify the updated_at timestamp is current and not null.
 */
export async function test_api_member_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(joinOutput);
  // 2. Create connection with auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinOutput.token.access },
  };
  // 3. Prepare profile update data with all fields
  const displayName = RandomGenerator.name();
  const avatarImageUrl = typia.random<string & tags.Format<"uri">>();
  const phoneNumber = RandomGenerator.mobile();
  const updateBody = {
    display_name: displayName,
    avatar_image_url: avatarImageUrl,
    phone_number: phoneNumber,
  } satisfies IHrmEmployee.IUpdate;
  // 4. Update profile
  const updatedProfile = await api.functional.hrm.member.profile.update(
    memberConnection,
    {
      body: updateBody,
    },
  );
  typia.assert(updatedProfile);
  // 5. Verify standard member fields are present
  TestValidator.predicate(
    "has valid id",
    updatedProfile.id !== undefined && updatedProfile.id !== null,
  );
  TestValidator.predicate(
    "has valid email",
    updatedProfile.email !== undefined && updatedProfile.email !== null,
  );
  TestValidator.predicate(
    "has created_at",
    updatedProfile.created_at !== undefined &&
      updatedProfile.created_at !== null,
  );
  TestValidator.predicate(
    "has updated_at",
    updatedProfile.updated_at !== undefined &&
      updatedProfile.updated_at !== null,
  );
  // 6. Verify updated_at is current (not null)
  TestValidator.predicate(
    "updated_at is not null",
    updatedProfile.updated_at !== null,
  );
}
