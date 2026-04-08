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

export async function test_api_post_vote_creation_and_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with auth token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 3. Cast upvote on a post
  const postId = typia.random<string & tags.Format<"uuid">>();
  const upvoteResponse =
    await api.functional.redditCommunity.member.posts.votes.submit(
      memberConnection,
      {
        postId,
        body: {
          vote_type: "upvote",
        } satisfies IRedditCommunityPostVote.IRequest,
      },
    );
  typia.assert(upvoteResponse);
  // 4. Verify upvote record structure
  TestValidator.equals(
    "vote_type is upvote",
    upvoteResponse.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "author matches authenticated member",
    upvoteResponse.author.id,
    memberAuth.id,
  );
  TestValidator.equals("post_id matches input", upvoteResponse.post.id, postId);
  TestValidator.equals(
    "post vote_score reflects upvote",
    upvoteResponse.post.vote_score,
    1,
  );
  // Store initial timestamps for comparison
  const initialCreatedAt = upvoteResponse.created_at;
  const initialUpdatedAt = upvoteResponse.updated_at;
  // 5. Cast downvote to update existing vote
  const downvoteResponse =
    await api.functional.redditCommunity.member.posts.votes.submit(
      memberConnection,
      {
        postId,
        body: {
          vote_type: "downvote",
        } satisfies IRedditCommunityPostVote.IRequest,
      },
    );
  typia.assert(downvoteResponse);
  // 6. Verify vote record is updated (same ID, different vote_type)
  TestValidator.equals(
    "vote record updated not created new",
    downvoteResponse.id,
    upvoteResponse.id,
  );
  TestValidator.equals(
    "vote_type changed to downvote",
    downvoteResponse.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "author unchanged after update",
    downvoteResponse.author.id,
    memberAuth.id,
  );
  // 7. Verify timestamps changed
  TestValidator.notEquals(
    "updated_at changed on vote update",
    initialUpdatedAt,
    downvoteResponse.updated_at,
  );
  // 8. Verify post vote_score reflects downvote
  TestValidator.equals(
    "post vote_score reflects downvote",
    downvoteResponse.post.vote_score,
    -1,
  );
}
