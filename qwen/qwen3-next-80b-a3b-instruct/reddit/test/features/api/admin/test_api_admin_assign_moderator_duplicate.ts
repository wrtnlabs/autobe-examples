import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_admin_assign_moderator_duplicate(
  connection: api.IConnection,
) {
  // 1. Create community - required for moderator assignment
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 2. Create member account - the one to be assigned as moderator
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // 3. Assign member as moderator (first assignment) - must be possible since connection is assumed admin-authenticated
  const assignment: ICommunityPlatformAdmin.IModeratorAssignment =
    await api.functional.admin.members.communities.moderator.assignModerator(
      connection,
      {
        memberId: member.id,
        communityId: community.id,
        body: {} satisfies ICommunityPlatformAdmin.IEmpty,
      },
    );
  typia.assert(assignment);
  TestValidator.equals("member ID matches", assignment.memberId, member.id);
  TestValidator.equals(
    "community ID matches",
    assignment.communityId,
    community.id,
  );

  // 4. Attempt duplicate moderator assignment - should fail with 409
  await TestValidator.error(
    "duplicate moderator assignment should fail with 409 conflict",
    async () => {
      await api.functional.admin.members.communities.moderator.assignModerator(
        connection,
        {
          memberId: member.id,
          communityId: community.id,
          body: {} satisfies ICommunityPlatformAdmin.IEmpty,
        },
      );
    },
  );
}
