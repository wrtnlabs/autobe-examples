import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member profile display name update after registration.
 *
 * Validates that a newly registered member can update their display name from
 * the initial value to a meaningful personal label. The test verifies the
 * complete profile update flow including registration, authentication, and
 * display name modification through the PUT /todoApp/member/profile endpoint.
 *
 * The display name has no uniqueness constraint across members, so this update
 * should always succeed for any non-empty value. The test verifies that the
 * response correctly reflects the updated display name while preserving
 * immutable fields like email, id, and created_at.
 *
 * 1. Register a new member with random credentials and initial display name
 *    using the authorize_member_join utility.
 * 2. Extract the initial profile data including id, email, created_at, and
 *    updated_at from the join response.
 * 3. Update the display name to "Alice" through the profile update endpoint.
 * 4. Validate the response contains the new display_name "Alice".
 * 5. Validate the email remains unchanged from the initial value.
 * 6. Validate the id is consistent with the authenticated member's identity.
 * 7. Validate created_at remains unchanged after the profile update.
 * 8. Validate updated_at reflects the modification time and differs from
 *    the initial updated_at.
 */
export async function test_api_member_profile_display_name_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const initial = await authorize_member_join(memberConnection, {});
  // 2. Update display name to "Alice"
  const updated = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: "Alice",
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 3. Validate response
  TestValidator.equals(
    "display_name updated to Alice",
    updated.display_name,
    "Alice",
  );
  TestValidator.equals("email remains unchanged", updated.email, initial.email);
  TestValidator.equals("id is consistent", updated.id, initial.id);
  TestValidator.equals(
    "created_at remains unchanged",
    updated.created_at,
    initial.created_at,
  );
  TestValidator.predicate(
    "updated_at reflects modification time",
    updated.updated_at !== initial.updated_at,
  );
}
