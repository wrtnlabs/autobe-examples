import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test that a community owner can successfully add a new member as a moderator to their community.
 * 1. Owner registers and authenticates
 * 2. Second member registers (will be added as moderator)
 * 3. Owner creates a community
 * 4. Owner adds second member as moderator with default 'mod' role
 * 5. Validate moderator record contains correct data
 */
export async function test_api_community_moderator_add_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: undefined,
  });
  typia.assert(ownerAuth);
  // 2. Second member authentication (to be added as moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: undefined,
  });
  typia.assert(moderatorAuth);
  // 3. Owner creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: undefined,
      },
    );
  typia.assert(community);
  // 4. Owner adds second member as moderator
  const moderator =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: moderatorAuth.id,
        },
      },
    );
  typia.assert(moderator);
  // 5. Validate moderator record
  TestValidator.equals(
    "moderator assigned to correct community",
    moderator.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator is the correct member",
    moderator.member.id,
    moderatorAuth.id,
  );
  TestValidator.equals("moderator role is 'mod'", moderator.role, "mod");
  TestValidator.predicate(
    "moderator has valid created_at timestamp",
    moderator.created_at != null,
  );
  TestValidator.predicate(
    "moderator has valid updated_at timestamp",
    moderator.updated_at != null,
  );
  TestValidator.predicate(
    "moderator is active (not deleted)",
    moderator.deleted_at === null,
  );
}
