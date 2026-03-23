import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_post_vote_status_no_vote_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(member);
  // 2. Get vote status for a non-existent post (no vote exists)
  // Using a randomly generated UUID that doesn't correspond to any real post
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  const voteStatus =
    await api.functional.redditLike.member.posts.votes.getVoteStatus(
      memberConnection,
      {
        postId: nonExistentPostId,
      },
    );
  // 3. Validate the response structure
  typia.assert(voteStatus);
  // 4. Check that vote status indicates no vote exists
  // Based on the endpoint description, it should return null when user has not voted
  TestValidator.equals(
    "no vote found for non-existent post",
    voteStatus === null || voteStatus === undefined,
    true,
  );
}
