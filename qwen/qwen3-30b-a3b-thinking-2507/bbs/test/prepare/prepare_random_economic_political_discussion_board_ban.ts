import { IEconomicPoliticalDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economic_political_discussion_board_ban(
  input?: DeepPartial<IEconomicPoliticalDiscussionBoardBan.ICreate> | undefined,
): IEconomicPoliticalDiscussionBoardBan.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
