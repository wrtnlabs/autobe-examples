import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { generate_random_reddit_clone_owner_communities_moderators_add_moderator } from "../../../generate/generate_random_reddit_clone_owner_communities_moderators_add_moderator";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_moderator_assignment } from "../../../prepare/prepare_random_reddit_clone_moderator_assignment";

export async function test_api_moderator_assignment_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account for testing
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.name(),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneOwner.IJoin;
  const owner = await authorize_owner_join(ownerConnection, {
    body: ownerData,
  });
  typia.assert(owner);
  // 2. Owner creates a community
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_url: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create another user to be appointed as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.name(),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneOwner.IJoin;
  const moderator = await authorize_owner_join(moderatorConnection, {
    body: moderatorData,
  });
  typia.assert(moderator);
  // 4. Owner appoints the user as a moderator
  const moderatorAssignment =
    await api.functional.redditClone.owner.communities.moderators.addModerator(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          communityId: community.id,
          appointedActorId: moderator.id,
          appointingActorId: owner.id,
          role: "moderator" as const,
        } satisfies IRedditCloneModeratorAssignment.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Owner retrieves the moderator assignment
  const retrievedAssignment =
    await api.functional.redditClone.moderator_assignments.at(ownerConnection, {
      assignmentId: moderatorAssignment.id,
    });
  typia.assert(retrievedAssignment);
  // 6. Validate the retrieved assignment
  TestValidator.equals(
    "assignment ID matches",
    retrievedAssignment.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "appointed actor ID matches",
    retrievedAssignment.appointedActor.id,
    moderator.id,
  );
  TestValidator.equals(
    "appointing actor ID matches",
    retrievedAssignment.appointingActor.id,
    owner.id,
  );
  TestValidator.equals(
    "role type is moderator",
    retrievedAssignment.role,
    "moderator",
  );
  TestValidator.equals(
    "status is active",
    retrievedAssignment.status,
    "active",
  );
  TestValidator.predicate(
    "revokedAt is null",
    retrievedAssignment.revokedAt === null,
  );
  TestValidator.predicate(
    "revokedBy is null",
    retrievedAssignment.revokedBy === null,
  );
}
