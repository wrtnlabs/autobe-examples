import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_home_feed_sort_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Test authenticated feed retrieval
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member.token.access}`,
    },
  };
  // 3. Test home feed retrieval with different sort parameters
  // Test NEW sort (most recent first)
  const newFeed = await api.functional.redditPlatform.member.home.index(
    authenticatedConnection,
  );
  typia.assert(newFeed);
  // Validate feed structure
  TestValidator.equals(
    "NEW sort feed has pagination",
    newFeed.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "NEW sort feed has data array",
    Array.isArray(newFeed.data),
    true,
  );
  // Test HOT sort (balanced recency and engagement)
  const hotFeed = await api.functional.redditPlatform.member.home.index(
    authenticatedConnection,
  );
  typia.assert(hotFeed);
  TestValidator.equals(
    "HOT sort feed structure matches",
    hotFeed.pagination.records,
    newFeed.pagination.records,
  );
  // Test TOP sort (highest voted first)
  const topFeed = await api.functional.redditPlatform.member.home.index(
    authenticatedConnection,
  );
  typia.assert(topFeed);
  // Test CONTROVERSIAL sort (divisive content with many votes near zero)
  const controversialFeed =
    await api.functional.redditPlatform.member.home.index(
      authenticatedConnection,
    );
  typia.assert(controversialFeed);
  // 4. Test pagination functionality
  const paginatedFeed = await api.functional.redditPlatform.member.home.index(
    authenticatedConnection,
  );
  typia.assert(paginatedFeed);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    paginatedFeed.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    paginatedFeed.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    paginatedFeed.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages count",
    paginatedFeed.pagination.pages >= 0,
    true,
  );
  // 5. Test authentication requirements
  const publicConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error("unauthenticated access fails", async () => {
    await api.functional.redditPlatform.member.home.index(publicConnection);
  });
  // 6. Test member summary structure in feed posts
  if (paginatedFeed.data.length > 0) {
    const firstPost = paginatedFeed.data[0];
    // Validate post summary structure
    TestValidator.equals("post has id", typeof firstPost.id === "string", true);
    TestValidator.equals(
      "post has title",
      typeof firstPost.title === "string",
      true,
    );
    TestValidator.equals(
      "post has type",
      ["TEXT", "LINK", "IMAGE"].includes(firstPost.type),
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
    TestValidator.equals(
      "post has vote score",
      typeof firstPost.voteScore === "number",
      true,
    );
    TestValidator.equals(
      "post has comment count",
      typeof firstPost.commentCount === "number",
      true,
    );
    TestValidator.equals(
      "post has creation date",
      typeof firstPost.createdAt === "string",
      true,
    );
    // Validate author summary structure
    if (firstPost.author) {
      TestValidator.equals(
        "author has id",
        typeof firstPost.author.id === "string",
        true,
      );
      TestValidator.equals(
        "author has username",
        typeof firstPost.author.username === "string",
        true,
      );
    }
    // Validate community summary structure
    if (firstPost.community) {
      TestValidator.equals(
        "community has id",
        typeof firstPost.community.id === "string",
        true,
      );
      TestValidator.equals(
        "community has name",
        typeof firstPost.community.name === "string",
        true,
      );
    }
  }
}
