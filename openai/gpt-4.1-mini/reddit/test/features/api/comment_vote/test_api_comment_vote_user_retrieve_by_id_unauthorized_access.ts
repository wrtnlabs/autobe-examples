import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommentVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUser";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_comment_votes_create } from "../../../generate/generate_random_community_platform_comment_votes_create";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";

export async function test_api_comment_vote_user_retrieve_by_id_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to retrieve a comment vote by a user who is not the owner or admin, expecting an authorization failure. This validates that the system enforces strict access control on comment vote records. Confirm that the response status is 403 Forbidden. The test setup requires creating a comment vote and authenticating as a different user to ensure access restriction.
  // 1. Register the first user (owner) and authorize
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_user_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "owner-password",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  ownerConnection.headers = { Authorization: ownerAuthorized.token.access };
  // 2. Register the second user (intruder) and authorize
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderAuthorized = await authorize_user_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "intruder-password",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  intruderConnection.headers = {
    Authorization: intruderAuthorized.token.access,
  };
  // 3. Create a comment vote by owner
  const commentVoteCreateBody: ICommunityPlatformCommentVote.ICreate = {
    communityPlatformCommentId: typia.random<string & tags.Format<"uuid">>(),
    voteType: "upvote",
  };
  const commentVote =
    await generate_random_community_platform_comment_votes_create(
      ownerConnection,
      { body: commentVoteCreateBody },
    );
  typia.assert(commentVote);
  // 4. Attempt to retrieve the comment vote by intruder - expect 403 Forbidden
  await TestValidator.httpError(
    "unauthorized user cannot access another user's comment vote",
    403,
    async () => {
      await api.functional.communityPlatform.user.commentVotes.users.at(
        intruderConnection,
        { commentVoteId: commentVoteCreateBody.communityPlatformCommentId },
      );
    },
  );
}
