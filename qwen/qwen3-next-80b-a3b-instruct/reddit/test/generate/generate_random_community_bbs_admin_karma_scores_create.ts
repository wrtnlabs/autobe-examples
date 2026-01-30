import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaScore";
import { prepare_random_community_bbs_karma_score } from "../prepare/prepare_random_community_bbs_karma_score";
export async function generate_random_community_bbs_admin_karma_scores_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsKarmaScore.ICreate>;
  },
): Promise<ICommunityBbsKarmaScore> {
  const prepared: ICommunityBbsKarmaScore.ICreate =
    prepare_random_community_bbs_karma_score(props.body);
  const result: ICommunityBbsKarmaScore =
    await api.functional.communityBbs.admin.karma_scores.create(connection, {
      body: prepared,
    });
  return result;
}
