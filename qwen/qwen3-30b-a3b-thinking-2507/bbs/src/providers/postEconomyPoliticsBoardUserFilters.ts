import { IEconomyPoliticsBoardSearchFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchFilter";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardSearchFilterCollector } from "../collectors/EconomyPoliticsBoardSearchFilterCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomyPoliticsBoardSearchFilterTransformer } from "../transformers/EconomyPoliticsBoardSearchFilterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomyPoliticsBoardUserFilters(props: {
  user: UserPayload;
  body: IEconomyPoliticsBoardSearchFilter.ICreate;
}): Promise<IEconomyPoliticsBoardSearchFilter> {
  const userEntity =
    await MyGlobal.prisma.economy_politics_board_users.findUnique({
      where: { id: props.user.id },
    });
  if (!userEntity) throw new HttpException("User not found", 404);
  const sessionEntity =
    await MyGlobal.prisma.economy_politics_board_user_sessions.findUnique({
      where: { id: props.user.session_id },
    });
  if (!sessionEntity) throw new HttpException("Session not found", 404);
  const created = await EconomyPoliticsBoardSearchFilterCollector.collect({
    body: props.body,
    economyPoliticsBoardUsers: userEntity,
    economyPoliticsBoardUserSessions: sessionEntity,
  });
  const result =
    await MyGlobal.prisma.economy_politics_board_search_filters.create({
      data: {
        ...created,
      },
    });
  return await EconomyPoliticsBoardSearchFilterTransformer.transform(result);
}
