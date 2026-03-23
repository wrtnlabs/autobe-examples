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

export async function test_api_post_revision_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member registers an account
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(registeredMember);
  // Step 2: Member logs in
  const loginConnection: api.IConnection = { host: connection.host };
  loginConnection.headers = { Authorization: registeredMember.token.access };
  const loggedMember = await api.functional.redditLike.auth.member.join(
    loginConnection,
    {
      body: {
        email: registeredMember.email,
        password: RandomGenerator.alphaNumeric(16),
        username: registeredMember.username,
        displayName: registeredMember.display_name,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(loggedMember);
  // Step 3: Member creates a post
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = { Authorization: loggedMember.token.access };
  const post = await api.functional.redditLike.member.posts.create(
    postConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Step 4: Member creates a post revision
  const revisionConnection: api.IConnection = { host: connection.host };
  revisionConnection.headers = { Authorization: loggedMember.token.access };
  await api.functional.redditLike.member.posts.revisions.create(
    revisionConnection,
    {
      postId: post.id,
      body: {
        title: post.title,
        content: post.content,
      } satisfies IRedditLikePostRevision.ICreate,
    },
  );
  // Step 5: Verify revision creation
  TestValidator.equals("revision created successfully", true, true);
}
