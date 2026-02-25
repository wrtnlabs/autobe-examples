import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community } from "../prepare/prepare_random_reddit_community";

export async function generate_random_reddit_member_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunity.ICreate> | undefined;
  },
): Promise<IRedditCommunity> {
  const prepared: IRedditCommunity.ICreate = prepare_random_reddit_community(
    props.body,
  );
  const result: IRedditCommunity =
    await api.functional.reddit.member.communities.create(connection, {
      body: prepared,
    });
  return result;
}
