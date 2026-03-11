import { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economic_political_board_attachment(
  input?: DeepPartial<IEconomicPoliticalBoardAttachment.ICreate>,
): IEconomicPoliticalBoardAttachment.ICreate {
  return {
    file_url: input?.file_url ?? typia.random<string & tags.Format<"uri">>(),
    file_name:
      input?.file_name ??
      `${RandomGenerator.alphaNumeric(8)}.${RandomGenerator.pick(["pdf", "png", "jpg", "gif", "doc", "xlsx"] as const)}`,
    file_type:
      input?.file_type ?? RandomGenerator.pick(["image", "file"] as const),
  };
}
