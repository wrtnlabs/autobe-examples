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
 * Test that a non-owner member cannot update a community and receives a 403 Forbidden response.
 *
 * Validates the authorization boundary for community updates by confirming that only the original
 * community owner is permitted to modify community attributes such as description and icon. A
 * different member who is not the owner attempts the update and is rejected with the expected
 * HTTP 403 status, confirming that community ownership is immutable and cannot be bypassed.
 *
 * 1. Owner registers and authenticates via authorize_member_join.
 * 2. Owner creates a community with random name and description.
 * 3. A different non-owner member registers and authenticates.
 * 4. Non-owner attempts to update the community's description.
 * 5. System rejects the request with HTTP 403 Forbidden.
 */
export async function test_api_community_update_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registers and authenticates
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Owner creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Non-owner registers and authenticates
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwner = await authorize_member_join(nonOwnerConnection, {});
  // 4. Non-owner attempts to update the community - expect 403
  await TestValidator.httpError(
    "non-owner cannot update community",
    403,
    async () => {
      await api.functional.communityHub.member.communities.update(
        nonOwnerConnection,
        {
          communityName: community.name,
          body: {
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityHubCommunity.IUpdate,
        },
      );
    },
  );
}
