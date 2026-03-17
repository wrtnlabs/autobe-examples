import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_moderator } from "../../../prepare/prepare_random_reddit_clone_moderator";

export async function test_api_moderator_assignment_by_existing_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create existing moderator account (will be added by owner first)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 3. Create new moderator account (will be added by existing moderator)
  const newModeratorConnection: api.IConnection = { host: connection.host };
  const newModeratorAuth = await authorize_member_join(newModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(newModeratorAuth);
  // 4. Create community with owner
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 5. Owner adds second member as moderator (setup step)
  const existingModeratorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: moderatorAuth.id,
        } satisfies IRedditCloneModerator.ICreate,
      },
    );
  typia.assert(existingModeratorAssignment);
  // Validate setup: existing moderator should have is_owner: false and addedBy: owner
  TestValidator.equals(
    "existing moderator is_owner should be false",
    existingModeratorAssignment.is_owner,
    false,
  );
  TestValidator.equals(
    "existing moderator addedBy should be owner",
    existingModeratorAssignment.addedBy?.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "existing moderator member should be moderator account",
    existingModeratorAssignment.member.id,
    moderatorAuth.id,
  );
  // 6. Existing moderator adds third member as moderator (main test)
  const newModeratorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      moderatorConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: newModeratorAuth.id,
        } satisfies IRedditCloneModerator.ICreate,
      },
    );
  typia.assert(newModeratorAssignment);
  // 7. Validate the new moderator assignment - business logic only
  TestValidator.equals(
    "new moderator is_owner should be false",
    newModeratorAssignment.is_owner,
    false,
  );
  TestValidator.equals(
    "new moderator addedBy should be existing moderator",
    newModeratorAssignment.addedBy?.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "new moderator member should be new moderator account",
    newModeratorAssignment.member.id,
    newModeratorAuth.id,
  );
  TestValidator.equals(
    "new moderator community should match",
    newModeratorAssignment.community.id,
    community.id,
  );
}
