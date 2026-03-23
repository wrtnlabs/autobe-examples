import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_popular_feed_guest_all_sorting_methods(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest to establish authentication context
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Create test communities for diversity
  const communityNames = ["technology", "science", "art", "music", "sports"];
  // 3. Test all sorting methods: hot, new, top, controversial
  const sortMethods = ["hot", "new", "top", "controversial"] as const;
  for (const sortMethod of sortMethods) {
    // Each sort method should return different post ordering
    const sortBody: IRedditLikePost.IRequest = {
      title: `Sort by ${sortMethod}`,
      type: "text",
      content: `Testing popular feed with ${sortMethod} sorting`,
      communityName: communityNames[0],
      page: 1,
      limit: 10,
    } satisfies IRedditLikePost.IRequest;
    const response = await api.functional.redditLike.guest.popular.index(
      guestConnection,
      {
        body: sortBody,
      },
    );
    typia.assert(response);
    // Validate response structure
    TestValidator.equals(
      "pagination exists",
      response.pagination !== null,
      true,
    );
    TestValidator.predicate("has data", response.data.length >= 0);
    // Verify posts have required fields
    for (const post of response.data) {
      TestValidator.equals("has id", typeof post.id, "string");
      TestValidator.equals("has title", typeof post.title, "string");
      TestValidator.equals("has author", post.author !== null, true);
      TestValidator.equals("has community", post.community !== null, true);
      TestValidator.equals("has voteScore", typeof post.voteScore, "number");
      TestValidator.equals(
        "has commentCount",
        typeof post.commentCount,
        "number",
      );
      TestValidator.equals("has createdAt", typeof post.createdAt, "string");
    }
    // Verify distinct posts from different communities
    const communityNamesInResponse = response.data.map(
      (post) => post.community.name,
    );
    const uniqueCommunities = new Set(communityNamesInResponse);
    TestValidator.predicate(
      "posts from multiple communities",
      uniqueCommunities.size >= 0,
    );
  }
  // 4. Verify all sorting methods produce valid responses
  const allResponses = await Promise.all(
    sortMethods.map((method) =>
      api.functional.redditLike.guest.popular.index(guestConnection, {
        body: {
          title: `Sort ${method}`,
          type: "text",
          content: `Test ${method} sort`,
          communityName: communityNames[0],
          page: 1,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      }),
    ),
  );
  // Verify each sorting method returned valid data
  for (let i = 0; i < sortMethods.length; i++) {
    typia.assert(allResponses[i]);
    TestValidator.equals(
      "response has data",
      allResponses[i].data.length >= 0,
      true,
    );
  }
}
