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

export async function test_api_post_vote_detail_repeated_vote_single_active_state(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(authorized);
  const postId = typia.random<string & tags.Format<"uuid">>();
  const direction = RandomGenerator.pick(["upvote", "downvote"] as const);
  const created: ICommunityPlatformPostVote =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        params: { postId },
        body: {
          direction,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(created);
  const updated: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.member.posts.votes.update(
      memberConnection,
      {
        postId,
        body: {
          direction,
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(updated);
  const detail: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.member.votes.at(memberConnection, {
      postVoteId: updated.id,
    });
  typia.assert(detail);
  TestValidator.equals(
    "repeated same-direction update preserves canonical vote id",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "detail vote id matches authoritative resource",
    detail.id,
    updated.id,
  );
  TestValidator.equals(
    "repeated same-direction vote keeps direction",
    detail.direction,
    direction,
  );
  TestValidator.equals(
    "member relation remains stable after repeated vote",
    detail.member,
    updated.member,
  );
  TestValidator.equals(
    "post relation remains stable after repeated vote",
    detail.post,
    updated.post,
  );
  TestValidator.equals("detail is active", detail.deleted_at, null);
}
