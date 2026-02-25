import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test link post creation workflow.
 * 1. Register new member
 * 2. Create link post with valid URL
 * 3. Validate post structure and fields
 */
export async function test_api_post_link_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create link post using member connection
  const post: IRedditCloneContentPost =
    await api.functional.redditClone.member.posts.create(memberConnection, {
      body: {
        type: "link",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneContentPost.ICreate,
    });
  typia.assert(post);
  // 3. Validate post structure
  TestValidator.predicate(
    "post has title",
    typeof post.title === "string" && post.title.length > 0,
  );
  TestValidator.predicate("post has author", typeof post.author === "object");
  TestValidator.predicate(
    "post has community",
    typeof post.community === "object",
  );
  TestValidator.equals("vote score is 0", post.vote_score, 0);
  TestValidator.equals("comment count is 0", post.comment_count, 0);
}
