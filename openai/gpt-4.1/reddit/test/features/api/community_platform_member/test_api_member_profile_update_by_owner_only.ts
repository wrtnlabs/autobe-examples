import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates owner-only profile updates for platform members.
 *
 * 1. Register member1 and verify authentication.
 * 2. Update member1's email as owner and confirm update.
 * 3. Register member2 (for forbidden test).
 * 4. As member2, attempt to update member1's profile and ensure access is denied.
 * 5. Attempt update on a non-existent memberId and verify error.
 * 6. Attempt to change status as a regular user, validate admin-only logic.
 */
export async function test_api_member_profile_update_by_owner_only(
  connection: api.IConnection,
) {
  // 1. Register member1
  const member1_email = typia.random<string & tags.Format<"email">>();
  const member1_password = RandomGenerator.alphaNumeric(12);
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1_email,
      password: member1_password,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // 2. As owner: update email of member1
  const new_email = typia.random<string & tags.Format<"email">>();
  const updated_member =
    await api.functional.communityPlatform.member.members.update(connection, {
      memberId: member1.id,
      body: {
        email: new_email,
      } satisfies ICommunityPlatformMember.IUpdate,
    });
  typia.assert(updated_member);
  TestValidator.equals(
    "updated email matches",
    updated_member.email,
    new_email,
  );

  // 3. Register member2 for forbidden access test
  const member2_email = typia.random<string & tags.Format<"email">>();
  const member2_password = RandomGenerator.alphaNumeric(12);
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2_email,
      password: member2_password,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // 4. As member2, attempt forbidden update on member1's profile
  await api.functional.auth.member.join(connection, {
    body: {
      email: member2_email,
      password: member2_password,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error(
    "member2 forbidden from updating other profile",
    async () => {
      await api.functional.communityPlatform.member.members.update(connection, {
        memberId: member1.id,
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies ICommunityPlatformMember.IUpdate,
      });
    },
  );

  // 5. Try updating a nonexistent member ID
  await TestValidator.error(
    "cannot update nonexistent member profile",
    async () => {
      await api.functional.communityPlatform.member.members.update(connection, {
        memberId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies ICommunityPlatformMember.IUpdate,
      });
    },
  );

  // 6. As owner, attempt to change status -- expect forbidden for non-admin
  await TestValidator.error(
    "owner cannot update status themselves (admin only)",
    async () => {
      await api.functional.communityPlatform.member.members.update(connection, {
        memberId: member1.id,
        body: { status: "blocked" } satisfies ICommunityPlatformMember.IUpdate,
      });
    },
  );
}
