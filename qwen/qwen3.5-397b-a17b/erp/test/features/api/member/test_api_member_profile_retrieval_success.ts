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
 * Test the primary success path for retrieving an authenticated member's global profile.
 *
 * Validates the complete profile retrieval flow including member registration, authentication, and profile access. Ensures that the profile correctly belongs to the authenticated member and that all required fields are properly populated.
 *
 * Special attention is given to verifying that the profile member reference matches the authenticated member account, the display name is present and non-empty, and the profile is active (deleted_at is null).
 *
 * 1. Member registers with randomized credentials via authorize_member_join utility.
 * 2. Utility function returns IHrmPlatformMember.IAuthorized with JWT tokens and updates connection headers.
 * 3. Call GET /hrmPlatform/member/profile with authenticated member connection.
 * 4. Validate profile structure with typia.assert() and business logic with TestValidator.
 * 5. Verify profile.member.id and profile.member.email match the authenticated member.
 * 6. Verify display_name is non-empty (business rule), deleted_at is null (active profile).
 */
export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member Registration and Authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(authorized);
  // 2. Profile Retrieval
  const profile: IHrmPlatformUserProfile =
    await api.functional.hrmPlatform.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate Business Logic
  // Display name is non-empty (required field per business rules)
  TestValidator.predicate(
    "display name is non-empty",
    profile.display_name.length > 0,
  );
  // Profile belongs to authenticated member (ownership verification)
  TestValidator.equals(
    "profile member id matches",
    profile.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile member email matches",
    profile.member.email,
    authorized.email,
  );
  // Profile is active (not soft deleted)
  TestValidator.equals("deleted_at is null", profile.deleted_at, null);
}
