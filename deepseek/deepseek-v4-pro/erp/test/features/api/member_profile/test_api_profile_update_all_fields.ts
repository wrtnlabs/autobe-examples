import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test updating all three global profile fields simultaneously.
 *
 * Validates that the member profile update endpoint correctly persists changes
 * to display_name, avatar_image, and phone_number when all three are sent in a
 * single PUT request. Ensures the response reflects each updated value and that
 * the updated_at timestamp advances beyond the original created_at timestamp,
 * confirming the database write was committed.
 *
 * 1. Join as a new member using authorize_member_join to establish a session.
 * 2. Send a PUT request with new values for display_name, avatar_image, and phone_number.
 * 3. Verify the response contains all three updated values matching the inputs.
 * 4. Validate that updated_at is strictly later than the join's created_at.
 */
export async function test_api_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member to establish authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(authorized);
  // 2. Prepare new values for all three profile fields
  const newDisplayName = RandomGenerator.name();
  const newAvatarImage = typia.random<string & tags.Format<"uri">>();
  const newPhoneNumber = RandomGenerator.mobile();
  // 3. Update all three profile fields in a single request
  const updatedProfile: IErpHrmMember =
    await api.functional.erpHrm.member.profile.update(memberConnection, {
      body: {
        display_name: newDisplayName,
        avatar_image: newAvatarImage,
        phone_number: newPhoneNumber,
      } satisfies IErpHrmMember.IUpdate,
    });
  typia.assert(updatedProfile);
  // 4. Validate all three fields reflect the updated values
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "avatar_image updated",
    updatedProfile.avatar_image,
    newAvatarImage,
  );
  TestValidator.equals(
    "phone_number updated",
    updatedProfile.phone_number,
    newPhoneNumber,
  );
  // 5. Validate updated_at is more recent than the original created_at
  TestValidator.predicate(
    "updated_at is more recent than created_at after profile update",
    updatedProfile.updated_at > authorized.created_at,
  );
}
