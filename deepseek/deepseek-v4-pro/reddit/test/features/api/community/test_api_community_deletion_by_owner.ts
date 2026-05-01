import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
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
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";

/**
 * Test community deletion by owner and verify name release for reuse.
 *
 * Validates the complete community deletion workflow where the authenticated
 * owner creates a community and then deletes it. Since the erase endpoint returns
 * void with no response body, the primary verification strategy focuses on the
 * cascading effect of name release — after successful deletion, the community's
 * unique name must become available for reuse by any member.
 *
 * 1. Owner registers and authenticates via authorize_member_join.
 * 2. Owner creates a community with a randomly generated unique name.
 * 3. Owner deletes the community they created.
 * 4. A different member registers and creates a new community using the same
 *    name, proving the name was released after deletion.
 * 5. Validates the new community has a different id, confirming it is a new
 *    record rather than a revived soft-deleted one.
 */
export async function test_api_community_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registration and authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community as owner
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Owner deletes the community
  await api.functional.communityHub.member.communities.erase(ownerConnection, {
    communityName: community.name,
  });
  // 4. Another member registers
  const otherConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherConnection, {});
  // 5. Create a new community with the same name — name must be released
  const newCommunity =
    await generate_random_community_hub_member_communities_create(
      otherConnection,
      {
        body: {
          name: community.name,
          description: community.description,
        },
      },
    );
  typia.assert(newCommunity);
  // 6. Verify name reuse with a different underlying record
  TestValidator.equals(
    "community name reused",
    newCommunity.name,
    community.name,
  );
  TestValidator.notEquals(
    "different community id",
    newCommunity.id,
    community.id,
  );
}
