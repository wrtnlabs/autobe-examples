import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import type { IRedditPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_post_text } from "../prepare/prepare_random_reddit_post_text";

export async function generate_random_reddit_member_communities_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPostText.ICreate> | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditPostText> {
  const prepared: IRedditPostText.ICreate = prepare_random_reddit_post_text(
    props.body,
  );
  const result: IRedditPostText =
    await api.functional.reddit.member.communities.posts.create(connection, {
      communityId: props.params.communityId,
      body: prepared,
    });
  return result;
}
