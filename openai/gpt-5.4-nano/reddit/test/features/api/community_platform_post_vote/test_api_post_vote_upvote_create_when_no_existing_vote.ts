import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

export async function test_api_post_vote_upvote_create_when_no_existing_vote(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Ensure admin token/header is set for subsequent calls
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  const voteConnection: api.IConnection = { host: connection.host };
  // Reuse token-bearing connection created by authorize_admin_join
  // (authorize_admin_join already updated adminConnection headers; voteConnection shares only host).
  // Therefore, use adminConnection for vote calls.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const testStartedAt = new Date().toISOString();
  const vote1 =
    await api.functional.communityPlatform.admin.posts.votes.updatePostVote(
      adminConnection,
      {
        postId,
        body: {
          voteDirection: "upvote",
          page: null,
          limit: null,
        },
      },
    );
  typia.assert(vote1);
  TestValidator.equals("deletedAt is null", vote1.deletedAt, null);
  TestValidator.predicate(
    "voteValue is positive for upvote",
    () => vote1.voteValue > 0,
  );
  TestValidator.predicate(
    "votedAt is after test started",
    () => vote1.votedAt >= testStartedAt,
  );
  TestValidator.equals(
    "voterId matches authenticated actor",
    vote1.voterId,
    admin.id,
  );
  const vote2 =
    await api.functional.communityPlatform.admin.posts.votes.updatePostVote(
      adminConnection,
      {
        postId,
        body: {
          voteDirection: "upvote",
          page: null,
          limit: null,
        },
      },
    );
  typia.assert(vote2);
  TestValidator.equals(
    "idempotent deletedAt",
    vote2.deletedAt,
    vote1.deletedAt,
  );
  TestValidator.equals(
    "idempotent voteValue",
    vote2.voteValue,
    vote1.voteValue,
  );
  TestValidator.equals("idempotent voterId", vote2.voterId, vote1.voterId);
}
