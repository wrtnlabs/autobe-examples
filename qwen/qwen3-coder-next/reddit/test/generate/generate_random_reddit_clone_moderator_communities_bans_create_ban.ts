import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_ban_record } from "../prepare/prepare_random_reddit_clone_ban_record";

export async function generate_random_reddit_clone_moderator_communities_bans_create_ban(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneBanRecord.ICreate> | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditCloneBanRecord> {
  const prepared: IRedditCloneBanRecord.ICreate =
    prepare_random_reddit_clone_ban_record(props.body);
  return await api.functional.redditClone.moderator.communities.bans.createBan(
    connection,
    {
      body: prepared,
      communityId: props.params.communityId,
    },
  );
}
