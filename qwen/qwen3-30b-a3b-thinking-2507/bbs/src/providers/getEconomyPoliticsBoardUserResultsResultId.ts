import { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import { IEconomyPoliticsBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleTag";
import { IEconomyPoliticsBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchResult";
import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomyPoliticsBoardSearchResultTransformer } from "../transformers/EconomyPoliticsBoardSearchResultTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomyPoliticsBoardUserResultsResultId(props: {
  user: UserPayload;
  resultId: string & tags.Format<"uuid">;
}): Promise<IEconomyPoliticsBoardSearchResult> {
  const select = EconomyPoliticsBoardSearchResultTransformer.select().select;
  const result =
    await MyGlobal.prisma.economy_politics_board_search_results.findUnique({
      where: {
        id: props.resultId,
        deleted_at: null,
      },
      select,
    });
  if (!result) {
    throw new HttpException("Search result not found", 404);
  }
  return await EconomyPoliticsBoardSearchResultTransformer.transform(result);
}
