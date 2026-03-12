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
 * Test that a non-owner member cannot update a community they don't own.
 *
 * This test validates the critical ownership boundary for community updates:
 * 1. Owner member creates a community
 * 2. Non-owner member attempts to update the community
 * 3. System rejects the update with 403 Forbidden status
 */
export async function test_api_community_update_by_non_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member connection and register
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create community as owner
  const community: IRedditCloneCommunity =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create non-owner member connection and register
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Non-owner attempts to update the community - should be rejected with 403
  await TestValidator.httpError(
    "non-owner update rejected with 403",
    403,
    async () => {
      await api.functional.redditClone.member.communities.update(
        nonOwnerConnection,
        {
          communityId: community.id,
          body: {
            name: "Updated Name",
            description: "Updated description by non-owner",
          } satisfies IRedditCloneCommunity.IUpdate,
        },
      );
    },
  );
}
