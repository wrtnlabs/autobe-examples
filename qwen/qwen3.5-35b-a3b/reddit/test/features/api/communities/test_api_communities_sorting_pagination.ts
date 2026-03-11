import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
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

export async function test_api_communities_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member and get authenticated connection
  const joinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "password123",
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    ...connection.headers,
    Authorization: joinResult.token.access,
  };
  // 2. Create test communities with varied data
  const createdCommunities: IRedditPlatformCommunity[] = [];
  for (let i = 0; i < 50; i++) {
    const created =
      await generate_random_reddit_platform_member_communities_create(
        authConnection,
        {
          body: {
            name: `testcommunity_${i}_${RandomGenerator.alphaNumeric(5)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            icon_url: null,
          },
        },
      );
    typia.assert(created);
    createdCommunities.push(created);
  }
  typia.assert(createdCommunities);
  // 3. Test sortBy=created_at, sortOrder=desc (newest first)
  {
    const response = await api.functional.redditPlatform.communities.index(
      connection,
      {
        body: {
          sortBy: "created_at" as const,
          sortOrder: "desc" as const,
          page: 1,
          limit: 20,
        },
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "newest first: page 1 count",
      response.pagination.records,
      50,
    );
    TestValidator.equals("newest first: limit", response.pagination.limit, 20);
    TestValidator.equals(
      "newest first: current page",
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      "newest first: total pages",
      response.pagination.pages,
      3,
    );
  }
  // 4. Test sortBy=created_at, sortOrder=asc (oldest first)
  {
    const response = await api.functional.redditPlatform.communities.index(
      connection,
      {
        body: {
          sortBy: "created_at" as const,
          sortOrder: "asc" as const,
          page: 1,
          limit: 20,
        },
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "oldest first: page 1 count",
      response.pagination.records,
      50,
    );
  }
  // 5. Test sortBy=subscriber_count, sortOrder=desc (most subscribed first)
  {
    const response = await api.functional.redditPlatform.communities.index(
      connection,
      {
        body: {
          sortBy: "subscriber_count" as const,
          sortOrder: "desc" as const,
          page: 1,
          limit: 20,
        },
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "subscriber_count desc: page 1 count",
      response.pagination.records,
      50,
    );
  }
  // 6. Test sortBy=name, sortOrder=asc (alphabetical)
  {
    const response = await api.functional.redditPlatform.communities.index(
      connection,
      {
        body: {
          sortBy: "name" as const,
          sortOrder: "asc" as const,
          page: 1,
          limit: 20,
        },
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "name asc: page 1 count",
      response.pagination.records,
      50,
    );
  }
  // 7. Test pagination: page=2
  {
    const response = await api.functional.redditPlatform.communities.index(
      connection,
      {
        body: {
          sortBy: "created_at" as const,
          sortOrder: "desc" as const,
          page: 2,
          limit: 20,
        },
      },
    );
    typia.assert(response);
    TestValidator.equals("page 2: current", response.pagination.current, 2);
    TestValidator.equals("page 2: limit", response.pagination.limit, 20);
    TestValidator.equals(
      "page 2: total records",
      response.pagination.records,
      50,
    );
    TestValidator.equals("page 2: total pages", response.pagination.pages, 3);
  }
  // 8. Test pagination: larger limit=50
  {
    const response = await api.functional.redditPlatform.communities.index(
      connection,
      {
        body: {
          sortBy: "created_at" as const,
          sortOrder: "desc" as const,
          page: 1,
          limit: 50,
        },
      },
    );
    typia.assert(response);
    TestValidator.equals("limit=50: current", response.pagination.current, 1);
    TestValidator.equals("limit=50: limit", response.pagination.limit, 50);
    TestValidator.equals(
      "limit=50: total records",
      response.pagination.records,
      50,
    );
    TestValidator.equals("limit=50: total pages", response.pagination.pages, 1);
  }
}