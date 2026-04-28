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
 * Test member profile retrieval after successful join operation.
 *
 * Validates the complete member account lifecycle from registration through profile retrieval, ensuring all required profile fields are present and correctly populated. Verifies that members can successfully retrieve their own profile data using their member ID, confirming proper session context and organization scoping enforcement.
 *
 * The test creates a new member account through the join operation, which automatically establishes the member's organization context and generates authorization tokens. It then retrieves the member's profile using the GET /members/{memberId} endpoint, validating that all required fields match the expected values from the join operation.
 *
 * 1. Creates a new member account via authorized join operation.
 * 2. Retrieves the member's own profile details using their member ID.
 * 3. Validates response contains all required profile fields with correct values.
 * 4. Confirms email matches the account used for join.
 * 5. Verifies deleted_at is null for active account.
 * 6. Ensures timestamps are properly set and no organization scoping violation.
 */
export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Create a new member account via join operation
  const memberConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinDisplayName = RandomGenerator.name();
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: joinEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: joinDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Retrieve the member's own profile details using their member ID
  const profile = await api.functional.hrmPlatform.members.at(
    memberConnection,
    {
      memberId: joinResponse.id,
    },
  );
  typia.assert(profile);
  // 3. Confirm email matches the account used for join
  TestValidator.equals(
    "email matches the account used for join",
    profile.email,
    joinEmail,
  );
  // 4. Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
  // 5. Verify display name matches the join display name
  TestValidator.equals(
    "display_name matches join display_name",
    profile.display_name,
    joinDisplayName,
  );
  // 6. Validate timestamp ordering (updated_at >= created_at)
  TestValidator.predicate(
    "updated_at is greater than or equal to created_at",
    new Date(profile.updated_at).getTime() >=
      new Date(profile.created_at).getTime(),
  );
}
