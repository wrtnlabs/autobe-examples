import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_moderation } from "../prepare/prepare_random_reddit_platform_moderation";

export async function generate_random_reddit_platform_admin_reddit_platform_moderations_assign_moderator(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformModeration.ICreate> | undefined;
  },
): Promise<IRedditPlatformModeration> {
  const prepared: IRedditPlatformModeration.ICreate =
    prepare_random_reddit_platform_moderation(props.body);
  return await api.functional.redditPlatform.admin.redditPlatform.moderations.assignModerator(
    connection,
    {
      body: prepared,
    },
  );
}
