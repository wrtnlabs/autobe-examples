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

export async function test_api_post_retrieval_link_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(member);
  // 2. Retrieve a link post (using a valid post ID)
  // Since there's no post creation endpoint in the provided API,
  // we'll use a sample post ID from typia.random
  const postId = typia.random<string & tags.Format<"uuid">>();
  const retrieved = await api.functional.redditLike.member.posts.at(
    memberConnection,
    {
      postId: postId,
    },
  );
  typia.assert(retrieved);
  // 3. Validate link post properties
  TestValidator.equals("type is link", retrieved.type, "link");
  TestValidator.predicate("has title", retrieved.title.length > 0);
  TestValidator.equals(
    "author is member summary",
    typeof retrieved.author.id,
    "string",
  );
  TestValidator.equals(
    "author username exists",
    typeof retrieved.author.username,
    "string",
  );
  TestValidator.equals(
    "author display_name exists",
    typeof retrieved.author.display_name,
    "string",
  );
  TestValidator.predicate("has valid score", retrieved.score >= 0);
  TestValidator.predicate(
    "comment_count is non-negative",
    retrieved.comment_count >= 0,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    retrieved.created_at !== undefined && retrieved.created_at !== null,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    retrieved.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
}
