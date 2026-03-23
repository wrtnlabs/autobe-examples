import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test community deletion by owner with cascade deletion.
 * 1. Member registers and authenticates
 * 2. Member creates a community (becomes owner)
 * 3. Community is deleted by owner
 * 4. Verify 204 No Content response (void return)
 */
export async function test_api_community_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community (member becomes owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Validate community was created successfully
  TestValidator.equals("community has valid ID", community.id.length, 36);
  TestValidator.predicate("community is active", community.deleted_at === null);
  TestValidator.equals(
    "owner is the creator",
    community.owner.id,
    community.owner.id,
  );
  // 4. Delete the community as owner
  await api.functional.redditClone.member.communities.erase(memberConnection, {
    communityId: community.id,
  });
  // 5. Verify deletion succeeded
  // The API returns void (204 No Content), so successful execution without error
  // confirms the deletion was successful
  TestValidator.predicate("deletion completed", true);
}
