import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_community_ban } from "../prepare/prepare_random_reddit_clone_community_ban";

export async function generate_random_reddit_clone_member_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneCommunityBan.ICreate>;
  },
): Promise<IRedditCloneCommunityBan> {
  const prepared: IRedditCloneCommunityBan.ICreate =
    prepare_random_reddit_clone_community_ban(props.body);
  const result: IRedditCloneCommunityBan =
    await api.functional.redditClone.member.communities.create(connection, {
      body: prepared,
    });
  return result;
}
