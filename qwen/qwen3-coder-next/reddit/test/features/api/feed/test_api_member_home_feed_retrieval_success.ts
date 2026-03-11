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

export async function test_api_member_home_feed_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community name for the test
  const communityName = `community_${RandomGenerator.alphaNumeric(6)}`;
  // 3. Test home feed retrieval with valid IRedditLikePost.IRequest structure
  const feed = await api.functional.redditLike.member.home.index(
    memberConnection,
    {
      body: {
        title: `Home Feed Test - ${RandomGenerator.name()}`,
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 2 }),
        communityName: communityName,
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(feed);
  // 4. Validate feed response structure
  TestValidator.predicate(
    "feed has pagination object",
    feed.pagination !== undefined,
  );
  TestValidator.equals("feed has data array", Array.isArray(feed.data), true);
  // 5. Validate pagination fields
  TestValidator.predicate(
    "pagination has current page",
    feed.pagination.current >= 1,
  );
  TestValidator.predicate("pagination has limit", feed.pagination.limit >= 1);
  TestValidator.predicate(
    "pagination has records count",
    feed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    feed.pagination.pages >= 0,
  );
  // 6. Test with smaller pagination
  const smallPage = await api.functional.redditLike.member.home.index(
    memberConnection,
    {
      body: {
        title: "Small Page Test",
        type: "text",
        content: "Test content",
        communityName: communityName,
        page: 1,
        limit: 2,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(smallPage);
  TestValidator.predicate(
    "small page has limited posts",
    smallPage.data.length <= 2,
  );
  TestValidator.equals(
    "pagination records match",
    smallPage.pagination.records,
    feed.pagination.records,
  );
  // 7. Validate post summary structure if posts exist
  if (feed.data.length > 0) {
    const firstPost = feed.data[0];
    TestValidator.equals("post has valid ID", firstPost.id !== undefined, true);
    TestValidator.equals("post has title", firstPost.title !== undefined, true);
    TestValidator.equals(
      "post has type",
      ["text", "link", "image"].includes(firstPost.type),
      true,
    );
    TestValidator.equals(
      "post has author",
      firstPost.author !== undefined,
      true,
    );
    TestValidator.equals(
      "post has community",
      firstPost.community !== undefined,
      true,
    );
    TestValidator.predicate("post has vote score", firstPost.voteScore >= 0);
    TestValidator.predicate(
      "post has comment count",
      firstPost.commentCount >= 0,
    );
    TestValidator.equals(
      "post has creation timestamp",
      firstPost.createdAt !== undefined,
      true,
    );
  }
}
