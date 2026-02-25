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

export async function test_api_admin_flair_assignment_update_expiration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 3. Admin creates a community (using user connection since endpoint requires user actor)
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Admin creates a flair definition
  const flair =
    await generate_random_community_platform_admin_communities_flairs_create(
      adminConnection,
      {
        body: {
          display_text: RandomGenerator.paragraph({ sentences: 2 }),
          background_color: "#FF0000",
          text_color: "#FFFFFF",
          css_class: null,
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(flair);
  // 5. Admin assigns flair to user (permanent assignment - null expiration)
  const initialAssignment =
    await generate_random_community_platform_admin_communities_flair_assignments_create(
      adminConnection,
      {
        body: {
          community_platform_user_id: user.id,
          community_platform_community_flair_id: flair.id,
          expired_at: null,
        } satisfies ICommunityPlatformCommunityFlairAssignment.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(initialAssignment);
  // 6. Admin updates the assignment with future expiration date
  const futureExpiration = new Date(Date.now() + 86400000).toISOString(); // 24 hours from now
  const updatedAssignment =
    await api.functional.communityPlatform.admin.communities.flair_assignments.update(
      adminConnection,
      {
        communityId: community.id,
        assignmentId: initialAssignment.id,
        body: {
          expired_at: futureExpiration,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  // 7. Validate the update
  TestValidator.equals(
    "assignment ID unchanged",
    updatedAssignment.id,
    initialAssignment.id,
  );
  TestValidator.equals(
    "community unchanged",
    updatedAssignment.community.id,
    initialAssignment.community.id,
  );
  TestValidator.equals(
    "user unchanged",
    updatedAssignment.user.id,
    initialAssignment.user.id,
  );
  TestValidator.equals(
    "flair unchanged",
    updatedAssignment.flair.id,
    initialAssignment.flair.id,
  );
  TestValidator.equals(
    "assignedBy unchanged",
    updatedAssignment.assignedBy.id,
    initialAssignment.assignedBy.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedAssignment.created_at,
    initialAssignment.created_at,
  );
  TestValidator.notEquals(
    "expired_at changed from null to future date",
    initialAssignment.expired_at,
    updatedAssignment.expired_at,
  );
  TestValidator.equals(
    "expired_at set to specified future date",
    updatedAssignment.expired_at,
    futureExpiration,
  );
  TestValidator.predicate(
    "expiration date is in the future",
    new Date(updatedAssignment.expired_at!).getTime() > Date.now(),
  );
}
