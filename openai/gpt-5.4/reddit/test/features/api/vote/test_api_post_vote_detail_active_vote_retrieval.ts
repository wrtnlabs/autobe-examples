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

export async function test_api_post_vote_detail_active_vote_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Rely on the generation helper's internal preparation workflow to create
  // or resolve a valid voteable post prerequisite for this member vote.
  const createdVote: ICommunityPlatformPostVote =
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
  typia.assert(createdVote);
  const found: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.member.votes.at(memberConnection, {
      postVoteId: createdVote.id,
    });
  typia.assert(found);
  TestValidator.equals("vote id matches", found.id, createdVote.id);
  TestValidator.equals(
    "direction matches",
    found.direction,
    createdVote.direction,
  );
  TestValidator.equals(
    "member summary matches",
    found.member,
    createdVote.member,
  );
  TestValidator.equals("post summary matches", found.post, createdVote.post);
  TestValidator.equals(
    "created_at matches",
    found.created_at,
    createdVote.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    found.updated_at,
    createdVote.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    found.deleted_at,
    createdVote.deleted_at,
  );
  TestValidator.equals("persisted vote record matches", found, createdVote);
}
