import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";

/**
 * Test that members cannot follow themselves.
 *
 * This test validates the business rule preventing self-follows in the
 * community platform. A member attempting to follow themselves should receive a
 * validation error, ensuring the social graph maintains logical consistency and
 * prevents invalid self-referential relationships.
 *
 * Test flow:
 *
 * 1. Create a member account through authentication
 * 2. Attempt to create a follow relationship where memberId equals followingId
 *    (self-follow)
 * 3. Verify that the API rejects the self-follow request with an appropriate error
 * 4. Confirm that the follow relationship was not created
 */
export async function test_api_member_following_self_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<50> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    password: "ValidPassword123!",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authResult: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });

  typia.assert(authResult);
  const memberId: string & tags.Format<"uuid"> = authResult.id;

  // Step 2: Attempt to create a self-follow relationship
  // The member tries to follow themselves by using the same ID for both memberId and followingId
  await TestValidator.error(
    "self-follow should be prevented with error",
    async () => {
      await api.functional.communityPlatform.member.members.following.create(
        connection,
        {
          memberId: memberId,
          followingId: memberId, // Same as memberId - attempting self-follow
        },
      );
    },
  );
}
