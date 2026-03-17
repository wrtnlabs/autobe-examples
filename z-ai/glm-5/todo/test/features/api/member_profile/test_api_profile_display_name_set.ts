import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can successfully set their display name for the first time.
 *
 * Prerequisites:
 * 1. Create a new member account via join endpoint
 *
 * Test Steps:
 * 1. Create and authenticate as a new member
 * 2. Call PUT /privateTodoApp/member/profile with a valid display_name string value
 * 3. Verify the response returns the updated member profile
 * 4. Validate the response body contains:
 *    - id matching the authenticated member
 *    - email unchanged
 *    - displayName set to the provided value
 *    - updatedAt timestamp is recent (after createdAt)
 *    - deletedAt is null
 */
export async function test_api_profile_display_name_set(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Store original member data for comparison
  const originalMember = authorized;
  // 2. Update profile with a new display name
  const displayName = RandomGenerator.name();
  const updatedProfile =
    await api.functional.privateTodoApp.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: displayName,
        } satisfies IPrivateTodoAppMember.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. Validate the response
  TestValidator.equals(
    "id matches authenticated member",
    updatedProfile.id,
    originalMember.id,
  );
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    originalMember.email,
  );
  TestValidator.equals(
    "displayName updated",
    updatedProfile.displayName,
    displayName,
  );
  TestValidator.predicate(
    "updatedAt is after createdAt",
    new Date(updatedProfile.updatedAt) >= new Date(updatedProfile.createdAt),
  );
  TestValidator.equals("deletedAt is null", updatedProfile.deletedAt, null);
}
