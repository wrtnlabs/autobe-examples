import { IEconomicPoliticalBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economic_political_board_article_attachment(
  input?:
    | DeepPartial<IEconomicPoliticalBoardArticleAttachment.ICreate>
    | undefined,
): IEconomicPoliticalBoardArticleAttachment.ICreate {
  return {
    file_url: input?.file_url ?? typia.random<string & tags.Format<"uri">>(),
    file_name: input?.file_name ?? RandomGenerator.alphaNumeric(10) + ".pdf",
    file_type:
      input?.file_type ?? RandomGenerator.pick(["image", "file"] as const),
  };
}
