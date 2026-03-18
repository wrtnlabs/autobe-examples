import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_posts_create } from "../../../generate/generate_random_community_platform_admin_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_vote_direction_change_updates_score_and_karma(
  connection: api.IConnection,
): Promise<void> {
  // Actor-specific admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Prepare admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // Authorize admin (join + login)
  const joined = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_admin_login(loginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string & tags.Format<"password">,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(loggedIn);
  // Use a random UUID as postId (environment must have a post with this id)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 1) Baseline after setting downvote
  await api.functional.communityPlatform.admin.posts.votes
    .updatePostVote(loginConnection, {
      postId,
      body: {
        voteDirection: "downvote",
        page: null,
        limit: null,
      },
    })
    .then((r) => typia.assert(r));
  const baselinePost = await api.functional.communityPlatform.admin.posts.at(
    loginConnection,
    { postId },
  );
  typia.assert(baselinePost);
  const baselineScore = baselinePost.voteScore;
  const downVote =
    await api.functional.communityPlatform.admin.posts.votes.updatePostVote(
      loginConnection,
      {
        postId,
        body: {
          voteDirection: "downvote",
          page: null,
          limit: null,
        },
      },
    );
  typia.assert(downVote);
  const baselineVotedAt = downVote.votedAt;
  const baselineVoteValue = downVote.voteValue;
  // 2) Change to upvote
  const upVote =
    await api.functional.communityPlatform.admin.posts.votes.updatePostVote(
      loginConnection,
      {
        postId,
        body: {
          voteDirection: "upvote",
          page: null,
          limit: null,
        },
      },
    );
  typia.assert(upVote);
  TestValidator.equals(
    "deletedAt should be null (active vote)",
    upVote.deletedAt,
    null,
  );
  TestValidator.predicate(
    "voteValue should become positive for upvote",
    upVote.voteValue > 0,
  );
  TestValidator.notEquals(
    "votedAt should be updated",
    baselineVotedAt,
    upVote.votedAt,
  );
  TestValidator.notEquals(
    "voteValue should change",
    baselineVoteValue,
    upVote.voteValue,
  );
  // 3) Validate score delta +2
  const finalPost = await api.functional.communityPlatform.admin.posts.at(
    loginConnection,
    { postId },
  );
  typia.assert(finalPost);
  TestValidator.equals(
    "post voteScore should increase by exactly 2 after downvote->upvote",
    finalPost.voteScore,
    baselineScore + 2,
  );
}
