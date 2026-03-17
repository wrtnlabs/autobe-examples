import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_detail_removed_vote_visibility(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const created =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        params: {
          postId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          direction: RandomGenerator.pick(["upvote", "downvote"] as const),
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(created);
  await api.functional.communityPlatform.member.posts.votes.erase(
    memberConnection,
    {
      postId: created.post.id,
    },
  );
  try {
    const removed = await api.functional.communityPlatform.member.votes.at(
      memberConnection,
      {
        postVoteId: created.id,
      },
    );
    typia.assert(removed);
    TestValidator.equals("removed vote keeps same id", removed.id, created.id);
    TestValidator.equals(
      "removed vote keeps same post association",
      removed.post.id,
      created.post.id,
    );
    TestValidator.equals(
      "removed vote keeps same direction",
      removed.direction,
      created.direction,
    );
    TestValidator.predicate(
      "removed vote exposes deleted_at when still visible",
      removed.deleted_at !== null,
    );
  } catch (exp) {
    if (!(exp instanceof api.HttpError)) throw exp;
    TestValidator.predicate(
      "removed vote lookup may be hidden by visibility policy",
      exp.status === 403 || exp.status === 404,
    );
  }
}
