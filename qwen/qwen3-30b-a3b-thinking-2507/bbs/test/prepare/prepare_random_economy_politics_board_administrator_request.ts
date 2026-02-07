import { IEconomyPoliticsBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economy_politics_board_administrator_request(
  input?: DeepPartial<IEconomyPoliticsBoardAdministratorRequest.ICreate>,
): IEconomyPoliticsBoardAdministratorRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
