import { IEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economic_board_admin_request(
  input?: DeepPartial<IEconomicBoardAdminRequest.ICreate> | undefined,
): IEconomicBoardAdminRequest.ICreate {
  return {
    reason_text:
      input?.reason_text ??
      RandomGenerator.paragraph({ sentences: 5, wordMin: 6, wordMax: 12 }),
  };
}
