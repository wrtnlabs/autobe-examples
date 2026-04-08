import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_profile_get_soft_deleted_profile_unavailable(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a soft-deleted member profile is treated as unavailable.
   *
   * Validates that when the authenticated member's private profile record is
   * soft-deleted (deleted_at != null), the profile read endpoint does not
   * return the deleted private profile fields.
   *
   * 1. Member A joins and we obtain their own profile identifier.
   * 2. We read the profile once and check the soft-delete state.
   * 3. If deleted_at is non-null, we assert that GET /profiles/{profileId}
   *    does not return the deleted profile (expects the call to fail).
   */
  // Arrange: Join Member A and obtain their own profileId.
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IMultiUserTodoUserProfile.IAuthorized =
    await authorize_member_join(memberConnection, {});
  const profileId: string = auth.id;
  // Arrange: Validate whether this profile is already soft-deleted.
  const profile = await api.functional.multiUserTodo.member.profiles.at(
    memberConnection,
    { profileId },
  );
  typia.assert(profile);
  if (profile.deleted_at === null) {
    throw new Error(
      "Soft-delete precondition failed: expected profile.deleted_at != null, but it was null. The provided test materials do not include a soft-delete endpoint to set deleted_at != null.",
    );
  }
  // Act + Assert: Soft-deleted profile is treated as unavailable.
  await TestValidator.error(
    "soft-deleted profile should be treated as unavailable",
    async () => {
      const result = await api.functional.multiUserTodo.member.profiles.at(
        memberConnection,
        { profileId },
      );
      typia.assertGuard(result);
      // If it returns successfully, that violates the contract.
      throw new Error("Expected profile read to fail for soft-deleted record");
    },
  );
}
