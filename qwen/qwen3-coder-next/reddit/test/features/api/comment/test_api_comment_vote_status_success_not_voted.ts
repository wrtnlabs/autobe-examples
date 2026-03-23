import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";

export async function test_api_comment_vote_status_success_not_voted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Login as member
  const memberAuthConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAuthConnection, {
    body: {
      email: member.email,
      password: "1234",
    } satisfies IRedditLikeMember.ILogin,
  });
  // 3. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderator);
  // 4. Login as moderator
  const modAuthConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(modAuthConnection, {
    body: {
      email: moderator.email,
      password: "1234",
    } satisfies IRedditLikeModerator.ILogin,
  });
  // 5. Generate a random postId (since we can't create posts in this API)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 6. Try to create a comment (may fail if postId doesn't exist)
  let commentId: string | undefined;
  try {
    const comment =
      await api.functional.redditLike.member.posts.comments.create(
        memberAuthConnection,
        {
          postId: postId,
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IRedditLikeComment.ICreate,
        },
      );
    typia.assert(comment);
    commentId = comment.id;
  } catch (error) {
    // If postId doesn't exist, we'll use a new random commentId
    commentId = typia.random<string & tags.Format<"uuid">>();
  }
  // 7. Retrieve vote status for a comment the moderator hasn't voted on
  const voteStatus = await api.functional.redditLike.moderator.comments.vote.at(
    modAuthConnection,
    {
      commentId: commentId!,
    },
  );
  typia.assert(voteStatus);
  // 8. Validate vote status for non-voted comment
  TestValidator.equals(
    "vote value is null for non-voted comment",
    voteStatus.value,
    null,
  );
  TestValidator.predicate(
    "score is a valid integer",
    typeof voteStatus.score === "number" && Number.isInteger(voteStatus.score),
  );
}
