import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for voting
  const votingConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(votingConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Use synthetic postId since no post creation API available in SDK
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Cast upvote using the same member connection
  const upvote = await api.functional.redditCommunity.member.posts.votes.submit(
    votingConnection,
    {
      postId,
      body: { vote_type: "upvote" } satisfies IRedditCommunityPostVote.IRequest,
    },
  );
  typia.assert(upvote);
  // 4. Verify vote was created
  TestValidator.equals("vote type is upvote", upvote.vote_type, "upvote");
  TestValidator.equals("vote not deleted initially", upvote.deleted_at, null);
  // 5. Remove vote by sending null (same member, same connection)
  const deletedVote =
    await api.functional.redditCommunity.member.posts.votes.submit(
      votingConnection,
      {
        postId,
        body: { vote_type: null } satisfies IRedditCommunityPostVote.IRequest,
      },
    );
  typia.assert(deletedVote);
  // 6. Verify soft delete behavior
  TestValidator.equals(
    "vote type is null after removal",
    deletedVote.vote_type,
    null,
  );
  TestValidator.equals(
    "deleted_at is populated (soft delete)",
    deletedVote.deleted_at !== null,
    true,
  );
  TestValidator.equals(
    "vote record still exists (soft delete, not hard delete)",
    deletedVote.id !== undefined,
    true,
  );
}
