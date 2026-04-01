import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_post_vote } from "../prepare/prepare_random_reddit_community_post_vote";

export async function generate_random_reddit_community_member_posts_vote_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityPostVote.ICreate>;
    params: {
      postId: string;
    };
  },
): Promise<IRedditCommunityPostVote> {
  const prepared: IRedditCommunityPostVote.ICreate =
    prepare_random_reddit_community_post_vote(props.body);
  const result: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.vote.create(connection, {
      postId: props.params.postId,
      body: prepared,
    });
  return result;
}
