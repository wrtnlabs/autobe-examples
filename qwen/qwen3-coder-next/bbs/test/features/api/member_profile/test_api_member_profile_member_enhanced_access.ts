import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member profile retrieval for authenticated members.
 * Verifies that authenticated members can retrieve enhanced profile information
 * for other members, including bio field and account status details.
 */
export async function test_api_member_profile_member_enhanced_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (source) - establishes authenticated connection
  const sourceMemberConnection: api.IConnection = { host: connection.host };
  const sourceMember = await authorize_member_join(sourceMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(sourceMember);
  // 2. Register second member (target) - whose profile will be accessed
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(targetMember);
  // 3. Retrieve the target member's profile with authenticated connection
  const enhancedProfile = await api.functional.discussionBoard.members.at(
    sourceMemberConnection,
    {
      memberId: targetMember.member.id,
    },
  );
  typia.assert(enhancedProfile);
  // 4. Validate enhanced profile structure
  TestValidator.equals(
    "member id matches",
    enhancedProfile.id,
    targetMember.member.id,
  );
  TestValidator.equals(
    "email matches",
    enhancedProfile.email,
    targetMember.member.email,
  );
  TestValidator.equals(
    "display name matches",
    enhancedProfile.displayName,
    targetMember.member.display_name,
  );
  // 5. Verify enhanced fields are accessible for authenticated members
  if (enhancedProfile.bio !== undefined) {
    TestValidator.predicate(
      "bio is string or null",
      enhancedProfile.bio === null || typeof enhancedProfile.bio === "string",
    );
  }
  // 6. Verify account status fields are present
  TestValidator.equals(
    "is active matches",
    enhancedProfile.isActive,
    targetMember.member.is_active,
  );
  TestValidator.equals(
    "is admin matches",
    enhancedProfile.isAdmin,
    targetMember.member.is_admin,
  );
  TestValidator.equals(
    "is super admin matches",
    enhancedProfile.isSuperAdmin,
    targetMember.member.is_super_admin,
  );
  // 7. Verify timestamp fields are properly formatted
  TestValidator.predicate(
    "created at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$/.test(
      enhancedProfile.createdAt,
    ),
  );
  TestValidator.predicate(
    "updated at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$/.test(
      enhancedProfile.updatedAt,
    ),
  );
}
