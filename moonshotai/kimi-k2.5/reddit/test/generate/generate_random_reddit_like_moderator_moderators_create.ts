import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_moderator } from "../prepare/prepare_random_reddit_like_moderator";

export async function generate_random_reddit_like_moderator_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeModerator.ICreate>;
  },
): Promise<IRedditLikeModerator> {
  const prepared: IRedditLikeModerator.ICreate =
    prepare_random_reddit_like_moderator(props.body);
  const result: IRedditLikeModerator =
    await api.functional.redditLike.moderator.moderators.create(connection, {
      body: prepared,
    });
  return result;
}
