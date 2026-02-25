import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentSubscription";
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

export async function test_api_owner_add_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner and create community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await api.functional.redditClone.auth.owner.join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditCloneOwner.IJoin,
    },
  );
  typia.assert(owner);
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2. Register member and subscribe to community
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(member);
  await api.functional.redditClone.member.communities.subscribe.patchByCommunityid(
    memberConnection,
    {
      communityId: community.id,
      body: {},
    },
  );
  // 3. Owner appoints member as moderator
  const assignment =
    await api.functional.redditClone.owner.communities.moderators.addModerator(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          appointedActorId: member.id,
          appointingActorId: owner.id,
          communityId: community.id,
          role: "moderator",
        } satisfies IRedditCloneModeratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);
  // 4. Validate appointment
  TestValidator.equals(
    "appointed actor matches",
    assignment.appointedActor.id,
    member.id,
  );
  TestValidator.equals(
    "appointing actor matches",
    assignment.appointingActor.id,
    owner.id,
  );
  TestValidator.equals(
    "community matches",
    assignment.community.id,
    community.id,
  );
  TestValidator.equals("role is moderator", assignment.role, "moderator");
  TestValidator.equals("status is active", assignment.status, "active");
  TestValidator.equals("revokedAt is null", assignment.revokedAt, null);
  TestValidator.equals("revokedBy is null", assignment.revokedBy, null);
}
