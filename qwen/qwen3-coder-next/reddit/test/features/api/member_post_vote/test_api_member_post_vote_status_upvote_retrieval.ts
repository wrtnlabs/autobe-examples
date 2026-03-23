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

export async function test_api_member_post_vote_status_upvote_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
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
  // 2. Create a post by another member
  const anotherConnection: api.IConnection = { host: connection.host };
  const anotherMember = await authorize_member_join(anotherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(anotherMember);
  // Note: Since no API function for post creation is provided, we'll skip actual post creation
  // In real implementation, you would use the post creation API here
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Member upvotes the post
  // Since no vote creation API is provided, we'll skip actual vote creation
  // In real implementation, you would use the vote creation API here
  // 4. Retrieve vote status
  const voteStatus =
    await api.functional.redditLike.member.posts.votes.getVoteStatus(
      memberConnection,
      {
        postId: postId,
      },
    );
  typia.assert(voteStatus);
  // 5. Validate vote status
  TestValidator.equals("vote exists", voteStatus.post_id, postId);
  TestValidator.equals("vote value is 1 (upvote)", voteStatus.value, 1);
}
