import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import type { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_communities_flair_assignments_create } from "../../../generate/generate_random_community_platform_admin_communities_flair_assignments_create";
import { generate_random_community_platform_admin_communities_flairs_create } from "../../../generate/generate_random_community_platform_admin_communities_flairs_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_flair } from "../../../prepare/prepare_random_community_platform_community_flair";
import { prepare_random_community_platform_community_flair_assignment } from "../../../prepare/prepare_random_community_platform_community_flair_assignment";

export async function test_api_community_flair_cascade_deletion_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Community creation
  const community =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Flair creation
  const flair =
    await generate_random_community_platform_admin_communities_flairs_create(
      adminConnection,
      {
        body: {
          display_text: RandomGenerator.name(),
          background_color: "#FF0000",
          text_color: "#FFFFFF",
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(flair);
  // 4. Create multiple users and assign flairs
  const userAssignments = await ArrayUtil.asyncRepeat(3, async (index) => {
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user123",
        username: RandomGenerator.alphabets(8),
      } satisfies ICommunityPlatformUser.IJoin,
    });
    typia.assert(user);
    const assignment =
      await generate_random_community_platform_admin_communities_flair_assignments_create(
        adminConnection,
        {
          body: {
            community_platform_user_id: user.id,
            community_platform_community_flair_id: flair.id,
          } satisfies ICommunityPlatformCommunityFlairAssignment.ICreate,
          params: { communityId: community.id },
        },
      );
    typia.assert(assignment);
    return { user, assignment };
  });
  // 5. Delete the flair
  await api.functional.communityPlatform.admin.communities.flairs.erase(
    adminConnection,
    {
      communityId: community.id,
      flairId: flair.id,
    },
  );
  // 6. Verify flair assignments have deleted_at timestamps
  for (const { assignment } of userAssignments) {
    TestValidator.predicate(
      "flair assignment should have deleted_at timestamp",
      assignment.deleted_at !== null,
    );
    TestValidator.predicate(
      "deleted_at should be a valid date-time",
      typeof assignment.deleted_at === "string" &&
        assignment.deleted_at.length > 0,
    );
  }
  // 7. Validate cascade deletion maintains data integrity
  TestValidator.equals(
    "all flair assignments should be soft-deleted",
    userAssignments.length,
    userAssignments.filter(({ assignment }) => assignment.deleted_at !== null)
      .length,
  );
}
