import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_revisions_create } from "../../../generate/generate_random_reddit_like_member_posts_revisions_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_post_revision } from "../../../prepare/prepare_random_reddit_like_post_revision";

export async function test_api_post_revision_retrieval_restriction_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member and post
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member1);
  const post = await generate_random_reddit_like_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.name(),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 2. Create revision for the post
  const revisionBody = {
    title: post.title,
    content: post.content,
  } satisfies IRedditLikePostRevision.ICreate;
  await generate_random_reddit_like_member_posts_revisions_create(
    member1Connection,
    {
      params: { postId: post.id },
      body: revisionBody,
    },
  );
  // 3. Create second member without access
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member2);
  // 4. Try to access revision as unauthorized member - should fail
  await TestValidator.error(
    "unauthorized access to revision should be rejected",
    async () => {
      await api.functional.redditLike.member.posts.revisions.at(
        member2Connection,
        {
          postId: post.id,
          revisionId: 1,
        },
      );
    },
  );
  // 5. Verify original member can still access their revision
  const revision = await api.functional.redditLike.member.posts.revisions.at(
    member1Connection,
    {
      postId: post.id,
      revisionId: 1,
    },
  );
  typia.assert(revision);
  TestValidator.equals("revision title matches", revision.title, post.title);
}
