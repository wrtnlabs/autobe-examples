import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_controversial_posts_pagination(
  connection: api.IConnection,
) {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Configure pagination parameters for controversial posts
  const config: IRedditCloneFeedConfig.IRequest = {
    sort: "controversial",
    page: 1,
    limit: 20,
  };
  // 3. Call controversial posts endpoint with pagination
  const output: IPageIRedditCloneContentPost =
    await api.functional.redditClone.member.analytics.posts.controversial.index(
      memberConnection,
      { body: config },
    );
  typia.assert(output);
  // 4. Validate pagination structure
  TestValidator.equals("pagination exists", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 20);
  TestValidator.predicate(
    "pagination has records",
    output.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", output.pagination.pages >= 0);
  // 5. Validate posts array
  TestValidator.predicate("posts array exists", Array.isArray(output.data));
  TestValidator.predicate("posts count within limit", output.data.length <= 20);
  // 6. Validate post structure when posts exist
  if (output.data.length > 0) {
    const firstPost = output.data[0];
    TestValidator.equals("post has id", typeof firstPost.id, "string");
    TestValidator.equals("post has title", typeof firstPost.title, "string");
    TestValidator.equals("post has author", typeof firstPost.author, "object");
    TestValidator.equals(
      "post has community",
      typeof firstPost.community,
      "object",
    );
    TestValidator.equals(
      "vote_score is number",
      typeof firstPost.vote_score,
      "number",
    );
    TestValidator.equals(
      "comment_count is number",
      typeof firstPost.comment_count,
      "number",
    );
    TestValidator.equals(
      "created_at is ISO string",
      typeof firstPost.created_at,
      "string",
    );
    // Validate author structure
    TestValidator.equals("author has id", typeof firstPost.author.id, "string");
    TestValidator.equals(
      "author has username",
      typeof firstPost.author.username,
      "string",
    );
    // Validate community structure
    TestValidator.equals(
      "community has id",
      typeof firstPost.community.id,
      "string",
    );
    TestValidator.equals(
      "community has name",
      typeof firstPost.community.name,
      "string",
    );
    TestValidator.equals(
      "community has subscriberCount",
      typeof firstPost.community.subscriberCount,
      "number",
    );
  }
}
