import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../prepare/prepare_random_community_bbs_community";
export async function generate_random_community_bbs_member_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsCommunity.ICreate> | undefined;
  },
): Promise<ICommunityBbsCommunity> {
  const prepared: ICommunityBbsCommunity.ICreate =
    prepare_random_community_bbs_community(props.body);
  const result: ICommunityBbsCommunity =
    await api.functional.communityBbs.member.communities.create(connection, {
      body: prepared,
    });
  return result;
}
