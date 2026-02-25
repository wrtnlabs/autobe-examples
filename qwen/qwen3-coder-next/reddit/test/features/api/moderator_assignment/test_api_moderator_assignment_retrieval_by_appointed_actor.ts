import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { generate_random_reddit_clone_owner_communities_moderators_add_moderator } from "../../../generate/generate_random_reddit_clone_owner_communities_moderators_add_moderator";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_moderator_assignment } from "../../../prepare/prepare_random_reddit_clone_moderator_assignment";

export async function test_api_moderator_assignment_retrieval_by_appointed_actor(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account for appointment authority
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneOwner.IJoin;
  const owner = await authorize_owner_join(ownerConnection, {
    body: ownerData,
  });
  typia.assert(owner);
  // 2. Create moderator account to be appointed
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneModerator.IJoin;
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: moderatorData,
  });
  typia.assert(moderator);
  // 3. Owner creates a community
  const communityData = {
    name: RandomGenerator.alphabets(6),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCloneCommunity.ICreate;
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    { body: communityData },
  );
  typia.assert(community);
  // 4. Owner appoints the moderator to the community
  const appointmentData = {
    appointedActorId: moderator.id,
    appointingActorId: owner.id,
    communityId: community.id,
    role: "moderator",
  } satisfies IRedditCloneModeratorAssignment.ICreate;
  const assignment =
    await api.functional.redditClone.owner.communities.moderators.addModerator(
      ownerConnection,
      {
        communityId: community.id,
        body: appointmentData,
      },
    );
  typia.assert(assignment);
  // 5. Appointed moderator retrieves their assignment
  const retrievedAssignment =
    await api.functional.redditClone.moderator_assignments.at(
      moderatorConnection,
      {
        assignmentId: assignment.id,
      },
    );
  typia.assert(retrievedAssignment);
  // 6. Validate the retrieved assignment details
  TestValidator.equals(
    "assignment ID matches",
    retrievedAssignment.id,
    assignment.id,
  );
  TestValidator.equals(
    "community matches",
    retrievedAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "appointed actor matches moderator",
    retrievedAssignment.appointedActor.id,
    moderator.id,
  );
  TestValidator.equals(
    "appointing actor matches owner",
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
    "has valid created timestamp",
    new Date(retrievedAssignment.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "has valid updated timestamp",
    new Date(retrievedAssignment.updatedAt).getTime() >=
      new Date(retrievedAssignment.createdAt).getTime(),
  );
}
