import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaPenalty";
import { prepare_random_community_bbs_karma_penalty } from "../prepare/prepare_random_community_bbs_karma_penalty";
export async function generate_random_community_bbs_admin_karma_penalties_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsKarmaPenalty.ICreate>;
  },
): Promise<ICommunityBbsKarmaPenalty> {
  const prepared: ICommunityBbsKarmaPenalty.ICreate =
    prepare_random_community_bbs_karma_penalty(props.body);
  const result: ICommunityBbsKarmaPenalty =
    await api.functional.communityBbs.admin.karma_penalties.create(connection, {
      body: prepared,
    });
  return result;
}
