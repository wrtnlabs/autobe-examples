import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeSubscription";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_member_subscriptions_community_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  // 2. Create multiple communities (tech and non-tech related)
  const techCommunity1 =
    await api.functional.redditLike.member.communities.create(
      memberConnection,
      {
        body: { name: "typescript" } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(techCommunity1);
  const techCommunity2 =
    await api.functional.redditLike.member.communities.create(
      memberConnection,
      {
        body: { name: "javascript" } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(techCommunity2);
  const techCommunity3 =
    await api.functional.redditLike.member.communities.create(
      memberConnection,
      {
        body: { name: "programming" } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(techCommunity3);
  const nonTechCommunity1 =
    await api.functional.redditLike.member.communities.create(
      memberConnection,
      {
        body: { name: "cooking" } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(nonTechCommunity1);
  const nonTechCommunity2 =
    await api.functional.redditLike.member.communities.create(
      memberConnection,
      {
        body: { name: "travel" } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(nonTechCommunity2);
  // 3. Subscribe to communities
  await api.functional.redditLike.member.subscriptions.index(memberConnection, {
    body: {
      communityName: techCommunity1.name,
    } satisfies IRedditLikeSubscription.IRequest,
  });
  await api.functional.redditLike.member.subscriptions.index(memberConnection, {
    body: {
      communityName: techCommunity2.name,
    } satisfies IRedditLikeSubscription.IRequest,
  });
  await api.functional.redditLike.member.subscriptions.index(memberConnection, {
    body: {
      communityName: techCommunity3.name,
    } satisfies IRedditLikeSubscription.IRequest,
  });
  await api.functional.redditLike.member.subscriptions.index(memberConnection, {
    body: {
      communityName: nonTechCommunity1.name,
    } satisfies IRedditLikeSubscription.IRequest,
  });
  await api.functional.redditLike.member.subscriptions.index(memberConnection, {
    body: {
      communityName: nonTechCommunity2.name,
    } satisfies IRedditLikeSubscription.IRequest,
  });
  // 4. Search with tech-related keywords and validate results
  const scriptSearch =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {
          communityName: "script",
          offset: 0,
          limit: 10,
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(scriptSearch);
  TestValidator.equals("script search matches", scriptSearch.data.length, 2);
  // Search with "program" (matches programming)
  const programSearch =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {
          communityName: "program",
          offset: 0,
          limit: 10,
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(programSearch);
  TestValidator.equals("program search matches", programSearch.data.length, 1);
  TestValidator.equals(
    "program search community name",
    programSearch.data[0].community.name,
    "programming",
  );
  // Search with "cook" (matches cooking)
  const cookSearch = await api.functional.redditLike.member.subscriptions.index(
    memberConnection,
    {
      body: {
        communityName: "cook",
        offset: 0,
        limit: 10,
      } satisfies IRedditLikeSubscription.IRequest,
    },
  );
  typia.assert(cookSearch);
  TestValidator.equals("cook search matches", cookSearch.data.length, 1);
  TestValidator.equals(
    "cook search community name",
    cookSearch.data[0].community.name,
    "cooking",
  );
  // Search with empty string (should return all subscriptions)
  const allSearch = await api.functional.redditLike.member.subscriptions.index(
    memberConnection,
    {
      body: {
        communityName: "",
        offset: 0,
        limit: 100,
      } satisfies IRedditLikeSubscription.IRequest,
    },
  );
  typia.assert(allSearch);
  TestValidator.equals("empty search returns all", allSearch.data.length, 5);
  // 5. Test pagination with search
  const paginatedSearch =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {
          communityName: "script",
          offset: 0,
          limit: 1,
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "paginated search limit",
    paginatedSearch.data.length,
    1,
  );
  TestValidator.equals(
    "pagination records",
    paginatedSearch.pagination.records,
    2,
  );
  TestValidator.equals("pagination pages", paginatedSearch.pagination.pages, 2);
}
