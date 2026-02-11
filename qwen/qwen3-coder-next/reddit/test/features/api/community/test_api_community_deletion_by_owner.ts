import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member to own the community
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create community with the member as owner
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  TestValidator.equals("community created", community.owner.id, member.id);
  // 3. Delete the community
  const deletedCommunity =
    await api.functional.redditPlatform.member.communities.erase(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(deletedCommunity);
  // 4. Verify cascading deletion
  TestValidator.equals(
    "deleted community ID matches",
    deletedCommunity.id,
    community.id,
  );
  TestValidator.notEquals(
    "deleted_at timestamp is set",
    deletedCommunity.deleted_at,
    null,
  );
  TestValidator.equals(
    "deleted community owner matches",
    deletedCommunity.owner.id,
    member.id,
  );
  // 5. Verify community is properly deleted (soft delete with deleted_at set)
  TestValidator.predicate(
    "community has deleted_at timestamp",
    deletedCommunity.deleted_at !== null,
  );
}
