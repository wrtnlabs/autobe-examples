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

export async function test_api_community_owner_retrieve_moderator_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community (owner becomes creator)
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
  // 3. Create additional members to serve as moderators
  const moderatorCount = 3;
  const moderators: {
    connection: api.IConnection;
    auth: IRedditPlatformMember.IAuthorized;
    id: string & tags.Format<"uuid">;
  }[] = [];
  await ArrayUtil.asyncRepeat(moderatorCount, async (index) => {
    const modConnection: api.IConnection = { host: connection.host };
    const modAuth = await authorize_member_join(modConnection, {
      body: {
        email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1) + `_${index}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
    typia.assert(modAuth);
    moderators.push({
      connection: modConnection,
      auth: modAuth,
      id: modAuth.id,
    });
  });
  // 4. Add moderators to the community
  await ArrayUtil.asyncForEach(moderators, async (moderator) => {
    await generate_random_reddit_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: moderator.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  });
  // 5. Retrieve moderators list as owner
  const moderatorsList =
    await api.functional.redditPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorsList);
  // 6. Verify response contains all added moderators
  TestValidator.equals(
    "moderator count matches",
    moderatorsList.data.length,
    moderators.length,
  );
  // 7. Verify pagination metadata
  TestValidator.equals("current page", moderatorsList.pagination.current, 1);
  TestValidator.equals("limit", moderatorsList.pagination.limit, 10);
  TestValidator.equals(
    "total records",
    moderatorsList.pagination.records,
    moderators.length,
  );
  TestValidator.predicate(
    "total pages is positive",
    moderatorsList.pagination.pages > 0,
  );
  // 8. Verify each moderator record has correct member details
  await ArrayUtil.asyncForEach(moderatorsList.data, async (moderatorRecord) => {
    typia.assert(moderatorRecord);
    // Verify member details exist
    TestValidator.predicate(
      "member has username",
      moderatorRecord.member.username.length > 0,
    );
    TestValidator.predicate(
      "member has karma score",
      moderatorRecord.member.karma_score >= 0,
    );
    TestValidator.predicate(
      "member has created_at timestamp",
      moderatorRecord.member.created_at.length > 0,
    );
    // Verify moderator assignment has created_at timestamp
    TestValidator.predicate(
      "moderator assignment has created_at",
      moderatorRecord.created_at.length > 0,
    );
    // Verify community reference exists
    TestValidator.predicate(
      "community has name",
      moderatorRecord.community.name.length > 0,
    );
  });
  // 9. Verify all added moderators are in the list
  const retrievedMemberIds = moderatorsList.data.map((m) => m.member.id);
  await ArrayUtil.asyncForEach(moderators, async (moderator) => {
    TestValidator.predicate(
      `moderator ${moderator.auth.username} is in list`,
      retrievedMemberIds.includes(moderator.id),
    );
  });
}