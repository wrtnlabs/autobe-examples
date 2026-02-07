import { IEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchQuery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardSearchQueryCollector } from "../collectors/EconomyPoliticsBoardSearchQueryCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomyPoliticsBoardSearchQueryTransformer } from "../transformers/EconomyPoliticsBoardSearchQueryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomyPoliticsBoardUserQueries(props: {
  user: UserPayload;
  body: IEconomyPoliticsBoardSearchQuery.ICreate;
}): Promise<IEconomyPoliticsBoardSearchQuery> {
  const created =
    await MyGlobal.prisma.economy_politics_board_search_queries.create({
      data: await EconomyPoliticsBoardSearchQueryCollector.collect({
        body: props.body,
      }),
    });
  return await EconomyPoliticsBoardSearchQueryTransformer.transform(created);
}
