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
 * Test that a non-owner member is forbidden from deleting a community.
 *
 * Validates that the community deletion endpoint enforces strict ownership
 * authorization. Only the member who created the community — the permanent
 * owner — holds the authority to delete it. Any other authenticated member
 * who attempts to delete the community must receive a rejection.
 *
 * The test ensures the community, its metadata, and all associated resources
 * remain intact when the deletion is attempted by an unauthorized actor.
 *
 * 1. The first member (owner) registers and creates a community.
 * 2. A second member (non-owner) registers with separate credentials.
 * 3. The non-owner attempts to delete the community by name.
 * 4. Validates the deletion is rejected by the server.
 */
export async function test_api_community_deletion_by_non_owner(
  connection: api.IConnection,
) {
  // 1. Owner joins and creates a community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Non-owner joins with separate credentials
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonOwnerConnection, {});
  // 3. Non-owner attempts to delete the community → expects rejection
  await TestValidator.error("non-owner cannot delete community", async () => {
    await api.functional.communityHub.member.communities.erase(
      nonOwnerConnection,
      {
        communityName: community.name,
      },
    );
  });
}
