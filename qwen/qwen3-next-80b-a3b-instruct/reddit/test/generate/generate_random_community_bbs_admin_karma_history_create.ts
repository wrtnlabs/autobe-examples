import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaHistory";
import { prepare_random_community_bbs_karma_history } from "../prepare/prepare_random_community_bbs_karma_history";
export async function generate_random_community_bbs_admin_karma_history_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsKarmaHistory.ICreate> | undefined;
  },
): Promise<ICommunityBbsKarmaHistory> {
  const prepared: ICommunityBbsKarmaHistory.ICreate =
    prepare_random_community_bbs_karma_history(props.body);
  return await api.functional.communityBbs.admin.karma_history.create(
    connection,
    {
      body: prepared,
    },
  );
}
