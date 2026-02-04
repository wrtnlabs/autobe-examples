import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_discussion_ban } from "../prepare/prepare_random_economic_discussion_ban";

export async function generate_random_economic_discussion_administrator_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicDiscussionBan.ICreate> | undefined;
    params: {
      userId: string;
    };
  },
): Promise<void> {
  const prepared: IEconomicDiscussionBan.ICreate =
    prepare_random_economic_discussion_ban(props.body);
  return await api.functional.economicDiscussion.administrator.bans.create(
    connection,
    {
      body: prepared,
      userId: props.params.userId,
    },
  );
}
