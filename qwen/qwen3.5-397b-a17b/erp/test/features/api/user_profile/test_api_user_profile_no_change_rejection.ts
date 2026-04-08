import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test business logic validation that rejects profile update requests with no actual field changes.
 *
 * Validates the business rule that profile update operations must change at least one field value. This prevents unnecessary database writes and ensures that profile modifications are meaningful.
 *
 * The test authenticates a new member, retrieves their current profile information, and attempts to update the profile with identical values. The operation should be rejected with a business logic error indicating no changes were made.
 *
 * 1. Register new member account with randomized credentials.
 * 2. Extract current profile values from authentication response.
 * 3. Submit profile update request with exact same display_name, avatar_url, and phone_number.
 * 4. Verify operation is rejected due to no actual changes.
 */
export async function test_api_user_profile_no_change_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Verify profile exists and extract current values
  TestValidator.predicate("profile exists", authorized.profile !== null);
  const currentProfile = authorized.profile!;
  typia.assert(currentProfile);
  // 3. Attempt to update profile with identical values (should be rejected)
  const updateBody = {
    display_name: currentProfile.display_name,
    avatar_url: currentProfile.avatar_url,
    phone_number: currentProfile.phone_number,
  } satisfies IHrmPlatformUserProfile.IUpdate;
  await TestValidator.error("no change rejection", async () => {
    await api.functional.hrmPlatform.member.profile.update(memberConnection, {
      body: updateBody,
    });
  });
}
