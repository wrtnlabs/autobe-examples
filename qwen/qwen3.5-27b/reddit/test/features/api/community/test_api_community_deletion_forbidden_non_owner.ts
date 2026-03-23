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

export async function test_api_community_deletion_forbidden_non_owner(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that only community owners can delete communities.
   * 1. Owner member joins and creates a community
   * 2. Non-owner member joins
   * 3. Non-owner attempts to delete the community (should fail with 403)
   * 4. Verify community was not deleted (from creation response)
   */
  // 1. Owner member authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: undefined,
  });
  typia.assert(ownerAuth);
  // 2. Owner creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      { body: undefined },
    );
  typia.assert(community);
  // Verify community is initially active (not deleted)
  TestValidator.predicate(
    "community is initially active",
    community.deleted_at === null,
  );
  // 3. Non-owner member authentication
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_member_join(nonOwnerConnection, {
    body: undefined,
  });
  typia.assert(nonOwnerAuth);
  // 4. Verify different members
  TestValidator.notEquals(
    "owner and non-owner are different",
    ownerAuth.id,
    nonOwnerAuth.id,
  );
  // 5. Verify non-owner is not the community owner
  TestValidator.notEquals(
    "non-owner is not community owner",
    nonOwnerAuth.id,
    community.owner.id,
  );
  // 6. Non-owner attempts to delete the community (should fail with 403)
  await TestValidator.httpError(
    "non-owner cannot delete community - returns 403 Forbidden",
    403,
    async () =>
      await api.functional.redditClone.member.communities.erase(
        nonOwnerConnection,
        { communityId: community.id },
      ),
  );
  // 7. Verify community ownership hasn't changed
  TestValidator.equals(
    "community owner unchanged after failed deletion",
    community.owner.id,
    ownerAuth.id,
  );
}
