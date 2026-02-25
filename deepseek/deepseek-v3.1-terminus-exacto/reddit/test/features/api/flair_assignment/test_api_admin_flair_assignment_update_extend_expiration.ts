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

export async function test_api_admin_flair_assignment_update_extend_expiration(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create flair definition
  const flair =
    await generate_random_community_platform_admin_communities_flairs_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          display_text: RandomGenerator.alphabets(8),
          background_color: "#FF0000",
          text_color: "#FFFFFF",
          css_class: null,
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
      },
    );
  typia.assert(flair);
  // Create temporary flair assignment with near-term expiration
  const initialExpiration = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour from now
  const assignment =
    await generate_random_community_platform_admin_communities_flair_assignments_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          community_platform_user_id: userAuth.id,
          community_platform_community_flair_id: flair.id,
          expired_at: initialExpiration,
        } satisfies ICommunityPlatformCommunityFlairAssignment.ICreate,
      },
    );
  typia.assert(assignment);
  // Verify initial assignment properties
  TestValidator.equals(
    "assignment has initial expiration",
    assignment.expired_at,
    initialExpiration,
  );
  TestValidator.equals(
    "assignment user matches",
    assignment.user.id,
    userAuth.id,
  );
  TestValidator.equals(
    "assignment flair matches",
    assignment.flair.id,
    flair.id,
  );
  TestValidator.equals(
    "assignment community matches",
    assignment.community.id,
    community.id,
  );
  // Extend expiration date further into the future
  const extendedExpiration = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 1 week from now
  const updatedAssignment =
    await api.functional.communityPlatform.admin.communities.flair_assignments.update(
      adminConnection,
      {
        communityId: community.id,
        assignmentId: assignment.id,
        body: {
          expired_at: extendedExpiration,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  // Verify updated assignment properties
  TestValidator.equals(
    "assignment has extended expiration",
    updatedAssignment.expired_at,
    extendedExpiration,
  );
  TestValidator.equals(
    "user remains unchanged",
    updatedAssignment.user.id,
    assignment.user.id,
  );
  TestValidator.equals(
    "flair remains unchanged",
    updatedAssignment.flair.id,
    assignment.flair.id,
  );
  TestValidator.equals(
    "community remains unchanged",
    updatedAssignment.community.id,
    assignment.community.id,
  );
  TestValidator.equals(
    "assignedBy remains unchanged",
    updatedAssignment.assignedBy.id,
    assignment.assignedBy.id,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedAssignment.created_at,
    assignment.created_at,
  );
  // Verify assignment is still active (not expired)
  TestValidator.predicate(
    "assignment is still active",
    updatedAssignment.expired_at !== null,
  );
  TestValidator.predicate(
    "expiration is in the future",
    new Date(updatedAssignment.expired_at!) > new Date(),
  );
}
