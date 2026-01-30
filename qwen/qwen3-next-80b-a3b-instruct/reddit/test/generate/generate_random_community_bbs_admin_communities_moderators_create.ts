import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityModerator";
import { prepare_random_community_bbs_community_moderator } from "../prepare/prepare_random_community_bbs_community_moderator";
export async function generate_random_community_bbs_admin_communities_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsCommunityModerator.ICreate> | undefined;
    params: {
      communityCode: string;
    };
  },
): Promise<ICommunityBbsCommunityModerator> {
  const prepared: ICommunityBbsCommunityModerator.ICreate =
    prepare_random_community_bbs_community_moderator(props.body);
  return await api.functional.communityBbs.admin.communities.moderators.create(
    connection,
    {
      body: prepared,
      communityCode: props.params.communityCode,
    },
  );
}
