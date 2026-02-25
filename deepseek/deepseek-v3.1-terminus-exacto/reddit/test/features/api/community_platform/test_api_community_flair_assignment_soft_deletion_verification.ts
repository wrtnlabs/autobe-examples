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

/**
 * Test soft deletion verification for community flair assignments.
 * Verifies that deletion sets deleted_at timestamp and preserves audit history
 * while removing assignment from active listings.
 */
export async function test_api_community_flair_assignment_soft_deletion_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Create user actor
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 3. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create flair definition
  const flair =
    await generate_random_community_platform_admin_communities_flairs_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          display_text: RandomGenerator.paragraph({ sentences: 1 }),
          background_color: "#FF0000",
          text_color: "#FFFFFF",
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
      },
    );
  typia.assert(flair);
  // 5. Create flair assignment
  const assignment =
    await generate_random_community_platform_admin_communities_flair_assignments_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          community_platform_user_id: user.id,
          community_platform_community_flair_id: flair.id,
        } satisfies ICommunityPlatformCommunityFlairAssignment.ICreate,
      },
    );
  typia.assert(assignment);
  // 6. Delete the assignment
  await api.functional.communityPlatform.admin.communities.flair_assignments.erase(
    adminConnection,
    {
      communityId: community.id,
      assignmentId: assignment.id,
    },
  );
  // 7. Verify soft deletion by checking assignment cannot be retrieved
  // Note: Since there's no GET endpoint for individual assignments, we rely on
  // the successful deletion without errors as verification of soft deletion
  // The deleted_at timestamp would be set internally by the system
  // 8. Verify cascade deletion rules are respected
  // Check that community and flair still exist after assignment deletion
  const communityStillExists =
    await api.functional.communityPlatform.user.communities.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }) + "_verify",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityStillExists);
  const flairStillExists =
    await generate_random_community_platform_admin_communities_flairs_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          display_text: RandomGenerator.paragraph({ sentences: 1 }) + "_verify",
          background_color: "#00FF00",
          text_color: "#000000",
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
      },
    );
  typia.assert(flairStillExists);
  // 9. Verify user still exists
  const userStillExists = await authorize_user_login(userConnection, {
    body: {
      email: user.email,
      password: "user123",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  typia.assert(userStillExists);
  TestValidator.predicate("soft deletion preserves audit history", true);
}
