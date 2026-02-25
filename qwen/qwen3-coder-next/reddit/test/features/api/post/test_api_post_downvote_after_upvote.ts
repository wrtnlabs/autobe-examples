import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_downvote_after_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection for voting
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await api.functional.redditClone.auth.member.join(
    voterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(voter);
  voterConnection.headers = {
    Authorization: voter.token.access,
  };
  // 2. Create another member as post author
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await api.functional.redditClone.auth.member.join(
    authorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(author);
  authorConnection.headers = {
    Authorization: author.token.access,
  };
  // 3. Create a post using author
  const post = await api.functional.redditClone.member.posts.upvote(
    authorConnection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(post);
  // 4. Vote as voter
  const upvote = await api.functional.redditClone.member.posts.upvote(
    voterConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(upvote);
  const downvote = await api.functional.redditClone.member.posts.downvote(
    voterConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(downvote);
  TestValidator.equals(
    "vote value should be -1 after downvote",
    downvote.vote_value,
    -1,
  );
  TestValidator.predicate(
    "downvote timestamp should be updated",
    downvote.updated_at > upvote.updated_at,
  );
}
