import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderator_successful_assignment_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner setup: register and create community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_user_join(ownerConnection, {});
  typia.assert(owner);
  const community =
    await generate_random_community_platform_user_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Target user setup: register
  const candidateConnection: api.IConnection = { host: connection.host };
  const candidate = await authorize_user_join(candidateConnection, {});
  typia.assert(candidate);
  // 3. Assign moderator role
  const roleLevels = ["moderator", "admin", "junior"] as const;
  const role = RandomGenerator.pick(roleLevels);
  const notes = RandomGenerator.paragraph({ sentences: 2 });
  const assignment =
    await api.functional.communityPlatform.user.communities.moderators.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          user_id: candidate.id,
          role_level: role,
          notes: notes,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(assignment);
  // 4. Validate assignment structure
  TestValidator.equals("role level matches", assignment.role_level, role);
  TestValidator.predicate("is active", assignment.is_active);
  // 5. Validate user information
  TestValidator.equals(
    "assigned user matches candidate",
    assignment.user.id,
    candidate.id,
  );
  TestValidator.equals(
    "assigned user username",
    assignment.user.username,
    candidate.username,
  );
  TestValidator.equals(
    "assigned user display_name",
    assignment.user.display_name,
    candidate.display_name,
  );
  TestValidator.equals(
    "assigned user karma",
    assignment.user.karma,
    candidate.karma,
  );
  // 6. Validate community information
  TestValidator.equals(
    "community matches",
    assignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name",
    assignment.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description",
    assignment.community.description,
    community.description,
  );
  TestValidator.equals(
    "community owner",
    assignment.community.owner.id,
    community.owner.id,
  );
  // 7. Validate assigned_by information (should be owner)
  TestValidator.equals(
    "assigned_by matches owner",
    assignment.assigned_by.id,
    owner.id,
  );
  TestValidator.equals(
    "assigned_by username",
    assignment.assigned_by.username,
    owner.username,
  );
  // 8. Validate other assignment metadata
  if (notes !== null && notes !== undefined) {
    TestValidator.equals("notes matches input", assignment.notes, notes);
  } else {
    TestValidator.predicate(
      "notes can be null",
      () => assignment.notes === null || assignment.notes === undefined,
    );
  }
  // 9. Validate timestamps exist
  TestValidator.predicate(
    "has created_at",
    () => assignment.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at",
    () => assignment.updated_at !== undefined,
  );
  // deleted_at can be undefined/null
}
