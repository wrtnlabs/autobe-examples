import { IEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchQuery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomyPoliticsBoardSearchQueryTransformer } from "../transformers/EconomyPoliticsBoardSearchQueryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomyPoliticsBoardUserQueriesQueryId(props: {
  user: UserPayload;
  queryId: string & tags.Format<"uuid">;
  body: IEconomyPoliticsBoardSearchQuery.IUpdate;
}): Promise<IEconomyPoliticsBoardSearchQuery> {
  const query =
    await MyGlobal.prisma.economy_politics_board_search_queries.findUnique({
      where: { id: props.queryId },
      ...EconomyPoliticsBoardSearchQueryTransformer.select(),
    });
  if (!query || query.deleted_at !== null) {
    throw new HttpException("Search query not found", 404);
  }
  const data = {
    search_term: props.body.search_term,
    request_parameters: props.body.request_parameters ?? null,
    updated_at: toISOStringSafe(new Date()),
  };
  const updatedQuery =
    await MyGlobal.prisma.economy_politics_board_search_queries.update({
      where: { id: props.queryId },
      data,
      ...EconomyPoliticsBoardSearchQueryTransformer.select(),
    });
  return await EconomyPoliticsBoardSearchQueryTransformer.transform(
    updatedQuery,
  );
}
