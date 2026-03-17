import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_create } from "../../../generate/generate_random_community_platform_member_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

/**
 * Test community moderator assignment by community owner.
 *
 * This test validates that a community owner can successfully appoint
 * a new moderator to their community through the moderator assignment API.
 *
 * Test Flow:
 * 1. Register Member A (community owner)
 * 2. Member A creates a community (becomes owner automatically)
 * 3. Register Member B (to be appointed as moderator)
 * 4. Member A appoints Member B as moderator
 * 5. Verify the moderator record is created correctly
 */
export async function test_api_community_moderator_assignment_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate Member A (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // Step 2: Member A creates a community (automatically becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Register and authenticate Member B (will become moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorAuth);
  // Step 4: Member A (owner) appoints Member B as moderator
  const moderatorRecord =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: moderatorAuth.id,
        } satisfies ICommunityPlatformModerator.ICreate,
      },
    );
  typia.assert(moderatorRecord);
  // Step 5: Verify moderator record
  TestValidator.equals(
    "role should be moderator",
    moderatorRecord.role,
    "moderator",
  );
  TestValidator.equals(
    "member id matches",
    moderatorRecord.member.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "community id matches",
    moderatorRecord.community.id,
    community.id,
  );
  TestValidator.predicate(
    "deleted_at is null",
    moderatorRecord.deleted_at === null,
  );
  TestValidator.predicate(
    "created_at is set",
    moderatorRecord.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is set",
    moderatorRecord.updated_at !== null,
  );
}
