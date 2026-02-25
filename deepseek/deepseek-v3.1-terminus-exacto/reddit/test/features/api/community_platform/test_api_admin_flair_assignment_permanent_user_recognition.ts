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

export async function test_api_admin_flair_assignment_permanent_user_recognition(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  userConnection.headers = { Authorization: userAuth.token.access };
  // Create community with user connection
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 4,
          }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create flair with admin connection
  const flair =
    await generate_random_community_platform_admin_communities_flairs_create(
      adminConnection,
      {
        body: {
          display_text: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 1,
            wordMax: 3,
          }),
          background_color: "#FF0000",
          text_color: "#FFFFFF",
          css_class: null,
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(flair);
  // Create permanent flair assignment with admin connection
  const assignment =
    await generate_random_community_platform_admin_communities_flair_assignments_create(
      adminConnection,
      {
        body: {
          community_platform_user_id: userAuth.id,
          community_platform_community_flair_id: flair.id,
          expired_at: null,
        } satisfies ICommunityPlatformCommunityFlairAssignment.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(assignment);
  // Validate assignment is permanent
  TestValidator.equals("assignment is permanent", assignment.expired_at, null);
  // Validate relationship integrity
  TestValidator.equals(
    "user relationship matches",
    assignment.user.id,
    userAuth.id,
  );
  TestValidator.equals(
    "community relationship matches",
    assignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "flair relationship matches",
    assignment.flair.id,
    flair.id,
  );
  TestValidator.predicate(
    "assignedBy relationship exists",
    () =>
      assignment.assignedBy.id !== undefined &&
      assignment.assignedBy.id !== null,
  );
}
