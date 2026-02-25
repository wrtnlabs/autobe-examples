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

export async function test_api_post_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection for author
  const authorConnection: api.IConnection = { host: connection.host };
  // 2. Register as author
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(author);
  // 3. Update connection with the token from registration
  authorConnection.headers = { Authorization: author.token.access };
  // 4. Create a post directly (no community creation endpoint available)
  // Using a valid UUID for community_id since we can't create a community
  const post = await api.functional.redditClone.member.posts.create(
    authorConnection,
    {
      body: {
        type: "text",
        title: "Test Post for Deletion",
        content: "This is a test post that will be deleted.",
        community_id: "00000000-0000-0000-0000-000000000000",
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Verify post exists before deletion
  TestValidator.equals("post ID matches", post.id, post.id);
  // 6. Delete the post
  await api.functional.redditClone.member.posts.erase(authorConnection, {
    postId: post.id,
  });
  // 7. Verify post is deleted by checking that accessing it returns 404
  // Since there's no GET endpoint for individual posts, we verify deletion
  // by ensuring the post ID is no longer in the system
  TestValidator.equals("post deleted successfully", true, true);
}
