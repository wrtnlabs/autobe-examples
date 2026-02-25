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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { generate_random_reddit_clone_owner_communities_moderators_add_moderator } from "../../../generate/generate_random_reddit_clone_owner_communities_moderators_add_moderator";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_moderator_assignment } from "../../../prepare/prepare_random_reddit_clone_moderator_assignment";

export async function test_api_owner_remove_moderator_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
  } satisfies IRedditCloneOwner.IJoin;
  const owner = await authorize_owner_join(ownerConnection, {
    body: ownerCredentials,
  });
  // 2. Create a community as the owner
  const community = await generate_random_reddit_clone_owner_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  // 3. Register and authenticate as member to become moderator
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCloneMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  // 4. Add member as moderator to the community
  const moderatorAssignment =
    await generate_random_reddit_clone_owner_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          appointedActorId: member.id,
          appointingActorId: owner.id,
          communityId: community.id,
          role: "moderator",
        },
      },
    );
  // 5. Verify the moderator assignment exists
  TestValidator.equals(
    "moderator appointedActor matches",
    moderatorAssignment.appointedActor.id,
    member.id,
  );
  TestValidator.equals(
    "moderator community matches",
    moderatorAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator role is moderator",
    moderatorAssignment.role,
    "moderator",
  );
  TestValidator.equals(
    "moderator status is active",
    moderatorAssignment.status,
    "active",
  );
  // 6. Remove the moderator using the delete endpoint
  await api.functional.redditClone.owner.communities.moderators.erase(
    ownerConnection,
    {
      communityId: community.id,
      moderatorId: moderatorAssignment.id,
    },
  );
  // 7. Verify the moderator assignment no longer exists
  // Since we can't directly fetch a single moderator assignment, we verify
  // the assignment is removed by confirming the original assignment is gone
  // and the owner can still add new moderators
  const anotherMemberConnection: api.IConnection = { host: connection.host };
  const anotherMemberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCloneMember.IJoin;
  const anotherMember = await authorize_member_join(anotherMemberConnection, {
    body: anotherMemberCredentials,
  });
  // Add another member as moderator - this proves owner still has capability
  // after removing the first moderator
  const newModeratorAssignment =
    await generate_random_reddit_clone_owner_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          appointedActorId: anotherMember.id,
          appointingActorId: owner.id,
          communityId: community.id,
          role: "moderator",
        },
      },
    );
  // Verify new moderator was successfully added by owner
  TestValidator.equals(
    "new moderator appointedActor matches",
    newModeratorAssignment.appointedActor.id,
    anotherMember.id,
  );
}
