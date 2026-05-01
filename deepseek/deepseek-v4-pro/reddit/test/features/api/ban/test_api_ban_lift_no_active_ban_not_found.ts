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
 * Test that lifting a ban for a member with no active ban record returns 404.
 *
 * Validates the error handling of the unban endpoint when the target member has never been banned from the specified community. The community owner — who holds supreme authority — attempts to unban a member who has no active ban record, and the server correctly identifies the missing ban and rejects the request.
 *
 * 1. Registers a member who will serve as the never-banned target.
 * 2. Registers a second member to act as the community owner.
 * 3. The owner creates a community to establish the scope for the unban.
 * 4. The owner attempts to lift a ban on the never-banned member and expects a 404 response.
 */
export async function test_api_ban_lift_no_active_ban_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member who will never be banned — target of the unban attempt
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Register the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 3. Owner creates a community to establish the scope for the unban attempt
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 4. Owner attempts to unban member A who has never been banned → expect 404
  await TestValidator.httpError(
    "unban never-banned member returns 404",
    404,
    async () => {
      await api.functional.communityHub.member.communities.bans.erase(
        ownerConnection,
        {
          communityName: community.name,
          userId: memberA.id,
        },
      );
    },
  );
}
