import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_analytics_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Authenticate as moderator using join endpoint
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Test pagination: page 2, limit 10, sorted by total_users descending
  const page2Result =
    await api.functional.communityPlatform.moderator.analytics.index(
      moderatorConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          sort_by: "total_users",
          sort_order: "desc",
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(page2Result);
  // Validate pagination metadata
  TestValidator.equals("page number", page2Result.pagination.current, 2);
  TestValidator.equals("page limit", page2Result.pagination.limit, 10);
  TestValidator.predicate("has records", page2Result.pagination.records >= 0);
  TestValidator.predicate("has pages", page2Result.pagination.pages >= 0);
  // Validate sorting by total_users descending
  if (page2Result.data.length > 1) {
    for (let i = 1; i < page2Result.data.length; i++) {
      TestValidator.predicate(
        "total_users descending order",
        page2Result.data[i - 1].total_users >= page2Result.data[i].total_users,
      );
    }
  }
  // Test sorting by created_at ascending
  const createdAscResult =
    await api.functional.communityPlatform.moderator.analytics.index(
      moderatorConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(createdAscResult);
  // Validate sorting by created_at ascending
  if (createdAscResult.data.length > 1) {
    for (let i = 1; i < createdAscResult.data.length; i++) {
      TestValidator.predicate(
        "created_at ascending order",
        createdAscResult.data[i - 1].created_at <=
          createdAscResult.data[i].created_at,
      );
    }
  }
  // Test sorting by engagement_rate descending
  const engagementDescResult =
    await api.functional.communityPlatform.moderator.analytics.index(
      moderatorConnection,
      {
        body: {
          sort_by: "engagement_rate",
          sort_order: "desc",
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(engagementDescResult);
  // Validate sorting by engagement_rate descending
  if (engagementDescResult.data.length > 1) {
    for (let i = 1; i < engagementDescResult.data.length; i++) {
      TestValidator.predicate(
        "engagement_rate descending order",
        engagementDescResult.data[i - 1].engagement_rate >=
          engagementDescResult.data[i].engagement_rate,
      );
    }
  }
  // Test all available sorting options
  const sortOptions = [
    "created_at",
    "total_users",
    "total_posts",
    "total_comments",
    "engagement_rate",
  ] as const;
  const orderOptions = ["asc", "desc"] as const;
  for (const sortBy of sortOptions) {
    for (const sortOrder of orderOptions) {
      const result =
        await api.functional.communityPlatform.moderator.analytics.index(
          moderatorConnection,
          {
            body: {
              sort_by: sortBy,
              sort_order: sortOrder,
            } satisfies ICommunityPlatformSystemSnapshot.IRequest,
          },
        );
      typia.assert(result);
      TestValidator.predicate(
        `${sortBy} ${sortOrder} returns data`,
        Array.isArray(result.data),
      );
    }
  }
}
