import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_post_retrieval_text_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member for authorized access
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a random post using typia.random() since creation isn't supported
  const expectedPost = typia.random<IRedditLikePost>();
  // 3. Retrieve the post using its ID
  const retrievedPost = await api.functional.redditLike.member.posts.at(
    memberConnection,
    {
      postId: expectedPost.id,
    },
  );
  typia.assert(retrievedPost);
  // 4. Validate retrieved post structure
  TestValidator.equals("post ID matches", retrievedPost.id, expectedPost.id);
  TestValidator.equals(
    "title matches",
    retrievedPost.title,
    expectedPost.title,
  );
  TestValidator.equals("type matches", retrievedPost.type, expectedPost.type);
  TestValidator.equals(
    "content matches",
    retrievedPost.content,
    expectedPost.content,
  );
  TestValidator.equals("url matches", retrievedPost.url, expectedPost.url);
  TestValidator.equals(
    "image_url matches",
    retrievedPost.image_url,
    expectedPost.image_url,
  );
  TestValidator.equals(
    "score matches",
    retrievedPost.score,
    expectedPost.score,
  );
  TestValidator.equals(
    "comment_count matches",
    retrievedPost.comment_count,
    expectedPost.comment_count,
  );
  // Validate author structure
  TestValidator.equals(
    "author ID matches",
    retrievedPost.author.id,
    expectedPost.author.id,
  );
  TestValidator.equals(
    "author username matches",
    retrievedPost.author.username,
    expectedPost.author.username,
  );
  TestValidator.equals(
    "author display_name matches",
    retrievedPost.author.display_name,
    expectedPost.author.display_name,
  );
  // Validate community structure
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    expectedPost.community.name,
  );
  TestValidator.equals(
    "community icon_url matches",
    retrievedPost.community.icon_url,
    expectedPost.community.icon_url,
  );
  TestValidator.equals(
    "community subscriber_count matches",
    retrievedPost.community.subscriber_count,
    expectedPost.community.subscriber_count,
  );
  // Validate timestamps
  TestValidator.equals(
    "created_at matches",
    retrievedPost.created_at,
    expectedPost.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedPost.updated_at,
    expectedPost.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    retrievedPost.deleted_at,
    expectedPost.deleted_at,
  );
}
