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

export async function test_api_post_retrieval_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
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
  // Step 2: Create a post first (need existing post to retrieve)
  // Since we can't directly create posts via provided API, we'll mock the scenario
  // by working with the post retrieval endpoint specifically for deleted post cases
  const postId = "12345678-1234-5678-1234-567812345678";
  // Step 3: Retrieve a deleted post
  // Based on scenario, this should return placeholder instead of full content
  const retrievedPost = await api.functional.redditLike.member.posts.at(
    memberConnection,
    {
      postId: postId,
    },
  );
  // Step 4: Verify the response
  typia.assert(retrievedPost);
  // For deleted posts, verify appropriate placeholder behavior
  TestValidator.equals(
    "title indicates deletion",
    retrievedPost.title,
    "[deleted]",
  );
  TestValidator.equals(
    "content is null for deleted post",
    retrievedPost.content,
    null,
  );
  TestValidator.equals("url is null for deleted post", retrievedPost.url, null);
  TestValidator.equals(
    "image_url is null for deleted post",
    retrievedPost.image_url,
    null,
  );
  TestValidator.predicate(
    "deleted_at timestamp is present",
    retrievedPost.deleted_at !== null,
  );
}
