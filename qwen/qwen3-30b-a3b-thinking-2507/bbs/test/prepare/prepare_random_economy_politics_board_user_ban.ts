import { IEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economy_politics_board_user_ban(
  input?: DeepPartial<IEconomyPoliticsBoardUserBan.ICreate>,
): IEconomyPoliticsBoardUserBan.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 1 }),
    expire_at:
      input?.expire_at === null
        ? null
        : (input?.expire_at ??
          typia.random<string & tags.Format<"date-time">>()),
  };
}
