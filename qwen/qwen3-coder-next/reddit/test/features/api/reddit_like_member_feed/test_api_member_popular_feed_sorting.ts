import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_popular_feed_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // Test each sorting option
  const sortOptions = ["hot", "new", "controversial"] as const;
  for (const sort of sortOptions) {
    const response = await api.functional.redditLike.member.feed.popular.index(
      memberConnection,
      {
        body: {
          sort: sort as "hot" | "new" | "top" | "controversial",
        } satisfies IRedditLikePost.IRequest,
      },
    );
    typia.assert(response);
  }
  // Test top sorting with all time filters
  const timeFilters = ["today", "week", "month", "year", "all"] as const;
  for (const time of timeFilters) {
    const response = await api.functional.redditLike.member.feed.popular.index(
      memberConnection,
      {
        body: {
          sort: "top" as const,
          time: time as "today" | "week" | "month" | "year" | "all",
        } satisfies IRedditLikePost.IRequest,
      },
    );
    typia.assert(response);
  }
}
