import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_vote } from "../prepare/prepare_random_community_vote";

export async function generate_random_community_member_posts_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityVote.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityVote> {
  const prepared: ICommunityVote.ICreate = prepare_random_community_vote(
    props.body,
  );
  const result: ICommunityVote =
    await api.functional.community.member.posts.votes.create(connection, {
      postId: props.params.postId,
      body: prepared,
    });
  return result;
}
