import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_member_communities_moderators_create } from "../../../generate/generate_random_community_hub_member_communities_moderators_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_community_moderator } from "../../../prepare/prepare_random_community_hub_community_moderator";

/**
 * Test idempotency of moderator addition to a community.
 *
 * Validates that adding a member who is already a moderator of the community is
 * idempotent — the second call returns the same existing moderator record
 * without error. This confirms the operation is safe to call without checking
 * current moderator status first, as described in the specification.
 *
 * The test follows the natural community governance flow: an owner creates a
 * community, a separate member is registered, that member is added as moderator,
 * and then the same addition is attempted again. Both responses must share the
 * same id, role, and member identity.
 *
 * 1. Owner registers and authenticates via join endpoint.
 * 2. Owner creates a new community with a random unique name.
 * 3. A separate member account is created for the moderator role.
 * 4. Owner adds the member as moderator (first call).
 * 5. Owner adds the same member again (second call — idempotency test).
 * 6. Validates both moderator records have identical id, role, and member.
 */
export async function test_api_community_moderator_addition_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Owner creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create the moderator member account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 4. First call: add the member as moderator
  const firstResult =
    await generate_random_community_hub_member_communities_moderators_create(
      ownerConnection,
      {
        body: { username: moderator.username },
        params: { communityName: community.name },
      },
    );
  typia.assert(firstResult);
  // 5. Second call: add the same member again (idempotency test)
  const secondResult =
    await generate_random_community_hub_member_communities_moderators_create(
      ownerConnection,
      {
        body: { username: moderator.username },
        params: { communityName: community.name },
      },
    );
  typia.assert(secondResult);
  // 6. Verify idempotency: both records must be identical
  TestValidator.equals("idempotent - same id", firstResult.id, secondResult.id);
  TestValidator.equals(
    "idempotent - same role",
    firstResult.role,
    secondResult.role,
  );
  TestValidator.equals(
    "idempotent - same member username",
    firstResult.member.username,
    secondResult.member.username,
  );
}
