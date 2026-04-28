import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test simultaneous update of all mutable profile fields (display_name, avatar_image, phone_number).
 *
 * Validates the complete profile update workflow by registering a new member, updating all mutable fields at once, and verifying the response matches the input values. Ensures that the display_name, avatar_image URI, and phone_number are all correctly processed in a single update request.
 *
 * Immutable fields (id, email) are verified to remain unchanged from registration, confirming that only the intended fields are modified. The updated_at timestamp is automatically managed by the server and validated by typia.assert for proper date-time format.
 *
 * 1. Register and authenticate as a member via authorize_member_join
 * 2. Update profile with all mutable fields: display_name, avatar_image, phone_number
 * 3. Validate complete response structure with typia.assert
 * 4. Verify updated fields match the provided input values
 * 5. Verify immutable fields (id, email) remain unchanged
 */
export async function test_api_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorizedMember);
  // 2. Prepare profile update body with all mutable fields
  const body = {
    display_name: RandomGenerator.name(),
    avatar_image: typia.random<string & tags.Format<"uri">>(),
    phone_number: RandomGenerator.mobile(),
  } satisfies IHrmPlatformMember.IUpdate;
  // 3. Update profile with all mutable fields
  const updatedProfile = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    { body },
  );
  typia.assert(updatedProfile);
  // 4. Verify updated fields match input values
  TestValidator.equals(
    "display_name matches",
    updatedProfile.display_name,
    body.display_name,
  );
  TestValidator.equals(
    "avatar_image matches",
    updatedProfile.avatar_image,
    body.avatar_image,
  );
  TestValidator.equals(
    "phone_number matches",
    updatedProfile.phone_number,
    body.phone_number,
  );
  // 5. Verify immutable fields remain unchanged
  TestValidator.equals("id unchanged", updatedProfile.id, authorizedMember.id);
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    authorizedMember.email,
  );
}
