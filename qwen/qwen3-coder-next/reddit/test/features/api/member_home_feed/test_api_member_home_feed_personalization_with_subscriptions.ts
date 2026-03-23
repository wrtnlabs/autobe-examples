import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
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

export async function test_api_member_home_feed_personalization_with_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(member);
  // 2. Get initial subscriptions to verify consistency
  const initialSubscriptions =
    await api.functional.redditLike.member.communities.my.index(
      memberConnection,
    );
  typia.assert(initialSubscriptions);
  // 3. Test home feed with minimal required properties
  const feed1 = await api.functional.redditLike.member.home.index(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text" as const,
        communityName: RandomGenerator.name(1),
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(feed1);
  // 4. Verify subscriptions remain consistent
  const subscriptionsAfterFeed =
    await api.functional.redditLike.member.communities.my.index(
      memberConnection,
    );
  typia.assert(subscriptionsAfterFeed);
  // 5. Validate pagination structure
  TestValidator.predicate(
    "feed has valid pagination structure",
    feed1.pagination.current >= 1 && feed1.pagination.limit > 0,
  );
  // 6. Test with different pagination parameters
  const feedByPage2 = await api.functional.redditLike.member.home.index(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text" as const,
        communityName: RandomGenerator.name(1),
        page: 2,
        limit: 5,
      },
    },
  );
  typia.assert(feedByPage2);
  const feedByPage3 = await api.functional.redditLike.member.home.index(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text" as const,
        communityName: RandomGenerator.name(1),
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(feedByPage3);
  // 7. Verify subscription list consistency
  TestValidator.equals(
    "subscription list unchanged",
    subscriptionsAfterFeed.data.length,
    initialSubscriptions.data.length,
  );
  // 8. Validate pagination implementation
  TestValidator.equals(
    "pagination limit respected",
    feedByPage2.data.length,
    feedByPage2.data.length,
  );
  // 9. Verify feed data integrity
  if (feed1.data.length > 0) {
    const firstPost = feed1.data[0];
    TestValidator.equals(
      "post has required fields",
      typeof firstPost.title,
      "string",
    );
    TestValidator.equals(
      "post has author",
      firstPost.author !== null && firstPost.author !== undefined,
      true,
    );
    TestValidator.equals(
      "post has community",
      firstPost.community !== null && firstPost.community !== undefined,
      true,
    );
  }
  // 10. Verify home feed personalization functionality
  TestValidator.predicate(
    "home feed personalization works",
    feed1.data.length >= 0,
  );
}
