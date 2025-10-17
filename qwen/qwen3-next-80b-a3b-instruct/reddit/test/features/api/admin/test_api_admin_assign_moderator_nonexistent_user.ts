import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

export async function test_api_admin_assign_moderator_nonexistent_user(
  connection: api.IConnection,
) {
  // Create a community to use in the moderator assignment
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

  // Attempt to assign moderator privileges to a non-existent member ID
  const nonExistentUserId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "assigning moderator to non-existent user should fail",
    async () => {
      await api.functional.admin.members.communities.moderator.assignModerator(
        connection,
        {
          memberId: nonExistentUserId,
          communityId: community.id,
          body: {} satisfies ICommunityPlatformAdmin.IEmpty,
        },
      );
    },
  );
}
