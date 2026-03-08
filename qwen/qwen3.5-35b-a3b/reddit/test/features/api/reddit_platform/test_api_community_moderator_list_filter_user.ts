import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_moderator_list_filter_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member accounts
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberA);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberB);
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberC);
  // 2. Member A creates a community
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Member A adds Member B and Member C as moderators
  await api.functional.redditPlatform.member.communities.moderators.add(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        user_id: memberB.id,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  await api.functional.redditPlatform.member.communities.moderators.add(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        user_id: memberC.id,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  // 4. Test filter by Member B's user_id - expect exactly 1 record
  const memberBFilterConnection: api.IConnection = { host: connection.host };
  const memberBFilterResult =
    await api.functional.redditPlatform.member.communities.moderators.index(
      memberBFilterConnection,
      {
        communityId: community.id,
        body: {
          user_id: memberB.id,
        } satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(memberBFilterResult);
  TestValidator.equals(
    "filter by memberB returns 1 record",
    memberBFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "filter by memberB pagination records",
    memberBFilterResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "filter by memberB pagination pages",
    memberBFilterResult.pagination.pages,
    1,
  );
  typia.assert(memberBFilterResult.data[0]);
  TestValidator.equals(
    "moderator user_id matches filter",
    memberBFilterResult.data[0].user.id,
    memberB.id,
  );
  TestValidator.equals(
    "moderator user username matches",
    memberBFilterResult.data[0].user.username,
    memberB.username,
  );
  TestValidator.equals(
    "moderator user displayName matches",
    memberBFilterResult.data[0].user.displayName,
    memberB.displayName,
  );
  // 5. Test filter by Member C's user_id - expect exactly 1 record
  const memberCFilterConnection: api.IConnection = { host: connection.host };
  const memberCFilterResult =
    await api.functional.redditPlatform.member.communities.moderators.index(
      memberCFilterConnection,
      {
        communityId: community.id,
        body: {
          user_id: memberC.id,
        } satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(memberCFilterResult);
  TestValidator.equals(
    "filter by memberC returns 1 record",
    memberCFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "filter by memberC pagination records",
    memberCFilterResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "filter by memberC pagination pages",
    memberCFilterResult.pagination.pages,
    1,
  );
  typia.assert(memberCFilterResult.data[0]);
  TestValidator.equals(
    "moderator user_id matches filter",
    memberCFilterResult.data[0].user.id,
    memberC.id,
  );
  TestValidator.equals(
    "moderator user username matches",
    memberCFilterResult.data[0].user.username,
    memberC.username,
  );
  TestValidator.equals(
    "moderator user displayName matches",
    memberCFilterResult.data[0].user.displayName,
    memberC.displayName,
  );
  // 6. Test filter by non-existent user_id - expect empty array with valid pagination
  const nonExistentUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const nonExistentFilterConnection: api.IConnection = {
    host: connection.host,
  };
  const nonExistentFilterResult =
    await api.functional.redditPlatform.member.communities.moderators.index(
      nonExistentFilterConnection,
      {
        communityId: community.id,
        body: {
          user_id: nonExistentUserId,
        } satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(nonExistentFilterResult);
  TestValidator.equals(
    "filter by non-existent returns 0 records",
    nonExistentFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "filter by non-existent pagination records",
    nonExistentFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "filter by non-existent pagination pages",
    nonExistentFilterResult.pagination.pages,
    0,
  );
}
