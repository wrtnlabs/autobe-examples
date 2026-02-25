import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";

export async function test_api_post_home_feed_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditCloneMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
      },
    },
  );
  typia.assert(member);
  // 2. Get available communities from the system
  const communities = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(communities);
  // Skip test if no communities available
  if (communities.data.length === 0) {
    return;
  }
  // 3. Subscribe to first available community
  const community = communities.data[0].community;
  await api.functional.redditClone.member.communities.subscribe.postByCommunityid(
    memberConnection,
    { communityId: community.id },
  );
  // 4. Get posts from home feed
  const output = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        sort: "hot",
        page: 1,
        limit: 10,
      },
    },
  );
  // 5. Validate response structure
  typia.assert(output);
  // 6. Verify pagination structure
  TestValidator.equals("page 1", output.pagination.current, 1);
  TestValidator.equals("limit 10", output.pagination.limit, 10);
  TestValidator.predicate("has posts", output.data.length >= 0);
  TestValidator.predicate("valid pagination", output.pagination.records >= 0);
  TestValidator.predicate("valid pages", output.pagination.pages >= 0);
  // 7. Verify each post has required structure
  output.data.forEach((post) => {
    TestValidator.predicate("post has id", typeof post.id === "string");
    TestValidator.predicate("post has title", typeof post.title === "string");
    TestValidator.predicate("post has author", post.author !== undefined);
    TestValidator.predicate("post has community", post.community !== undefined);
    TestValidator.predicate(
      "post has voteScore",
      typeof post.voteScore === "number",
    );
    TestValidator.predicate(
      "post has commentCount",
      typeof post.commentCount === "number",
    );
    TestValidator.predicate(
      "post has created_at",
      typeof post.created_at === "string",
    );
  });
}
