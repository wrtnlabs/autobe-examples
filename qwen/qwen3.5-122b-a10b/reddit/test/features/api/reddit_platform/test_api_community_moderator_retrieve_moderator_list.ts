import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

/**
 * Test community moderator retrieve moderator list.
 * 1. Create first member account as community owner and authenticate
 * 2. Create a new community (owner becomes creator)
 * 3. Create second member account and authenticate
 * 4. Owner adds second member as moderator
 * 5. Call the retrieve moderators endpoint as the moderator (second member)
 * 6. Verify the response contains all moderators including the owner
 * 7. Verify moderator has same read access as owner
 * 8. Verify pagination and member details are correctly returned
 */
export async function test_api_community_moderator_retrieve_moderator_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account as community owner and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>()
      ),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a new community (owner becomes creator)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create second member account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>()
      ),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 4. Owner adds second member as moderator
  const moderatorAssignment =
    await generate_random_reddit_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: moderatorAuth.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Call the retrieve moderators endpoint as the moderator (second member)
  const moderatorsList =
    await api.functional.redditPlatform.communities.moderators.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorsList);
  // 6. Verify the response contains all moderators including the owner
  TestValidator.equals("moderator count", moderatorsList.data.length, 2);
  TestValidator.predicate(
    "has owner",
    moderatorsList.data.some((m) => m.member.id === ownerAuth.id),
  );
  TestValidator.predicate(
    "has added moderator",
    moderatorsList.data.some((m) => m.member.id === moderatorAuth.id),
  );
  // 7. Verify pagination and member details are correctly returned
  TestValidator.equals(
    "pagination current page",
    moderatorsList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", moderatorsList.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    moderatorsList.pagination.records,
    2,
  );
  TestValidator.equals("pagination pages", moderatorsList.pagination.pages, 1);
  // Verify each moderator has required member details
  for (const moderator of moderatorsList.data) {
    typia.assert(moderator);
  }
}