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

export async function test_api_moderator_assignment_update_denied_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await api.functional.redditClone.auth.owner.join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
      } satisfies IRedditCloneOwner.IJoin,
    },
  );
  typia.assert(owner);
  // 2. Create a community as owner
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Register a regular member who is NOT the owner
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: "https://example.com/profile/" + RandomGenerator.name(),
        referrer: "https://example.com/referrer/" + RandomGenerator.name(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(member);
  // 4. Owner assigns a moderator to the community
  const moderatorAssignment =
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
  typia.assert(moderatorAssignment);
  // 5. Member (non-owner) attempts to update moderator assignment
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "non-owner cannot update moderator assignment",
    403,
    async () => {
      await api.functional.redditClone.communities.moderator_assignments.updateModeratorAssignment(
        memberConnection,
        {
          communityId: community.id,
          body: {
            role: "owner",
          } satisfies IRedditCloneModeratorAssignment.IUpdate,
        },
      );
    },
  );
  // 6. Verify the assignment was not changed (still moderator, not owner)
  // Since the update failed, the assignment should remain unchanged
  TestValidator.equals(
    "moderator role unchanged after unauthorized update attempt",
    moderatorAssignment.role,
    "moderator",
  );
}