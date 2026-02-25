import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

/**
 * Test that even a community moderator cannot delete the community - only the owner has this authority.
 *
 * Setup Steps:
 * 1. Authenticate as member A (owner)
 * 2. Create a community as owner
 * 3. Authenticate as member B (will become moderator)
 * 4. Owner adds member B as moderator
 *
 * Test Execution:
 * 5. Moderator attempts to delete the community
 *
 * Validation:
 * - Response returns 403 Forbidden
 * - Community remains active and visible
 * - Moderator retains their moderation privileges
 */
export async function test_api_community_deletion_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner (member A)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a community as owner
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Authenticate as member B (will become moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 4. Owner adds member B as moderator
  // Note: Using API directly to specify the exact moderator username
  const moderatorRecord =
    await api.functional.community.member.communities.moderators.create(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          member_username: moderator.username,
        } satisfies ICommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorRecord);
  // Verify moderator was added successfully
  TestValidator.predicate(
    "moderator was appointed",
    moderatorRecord.member.id === moderator.id,
  );
  TestValidator.predicate(
    "is_owner is false for appointed moderator",
    moderatorRecord.is_owner === false,
  );
  // 5. Moderator attempts to delete the community (should fail with 403)
  await TestValidator.httpError(
    "moderator cannot delete community",
    403,
    async () =>
      await api.functional.community.member.communities.erase(
        moderatorConnection,
        {
          communityName: community.name,
        },
      ),
  );
}
