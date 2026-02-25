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

export async function test_api_admin_flair_assignment_temporary_event_badge(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(admin);
  // Create user connection and register a user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create a community using user connection (communities are created by users)
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create a flair definition using admin connection
  const flair =
    await generate_random_community_platform_admin_communities_flairs_create(
      adminConnection,
      {
        body: {
          display_text: RandomGenerator.paragraph({ sentences: 1 }),
          background_color: "#FF5733",
          text_color: "#FFFFFF",
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(flair);
  // Create temporary flair assignment with expiration date
  const expirationDate = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString(); // 24 hours from now
  const assignment =
    await generate_random_community_platform_admin_communities_flair_assignments_create(
      adminConnection,
      {
        body: {
          community_platform_user_id: user.id,
          community_platform_community_flair_id: flair.id,
          expired_at: expirationDate,
        } satisfies ICommunityPlatformCommunityFlairAssignment.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(assignment);
  // Validate the assignment properties
  TestValidator.equals(
    "assignment has expiration date",
    assignment.expired_at,
    expirationDate,
  );
  TestValidator.equals("assignment user matches", assignment.user.id, user.id);
  TestValidator.equals(
    "assignment community matches",
    assignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "assignment flair matches",
    assignment.flair.id,
    flair.id,
  );
  TestValidator.predicate(
    "assignment created at is valid",
    assignment.created_at !== null,
  );
  TestValidator.predicate(
    "assignment updated at is valid",
    assignment.updated_at !== null,
  );
}
