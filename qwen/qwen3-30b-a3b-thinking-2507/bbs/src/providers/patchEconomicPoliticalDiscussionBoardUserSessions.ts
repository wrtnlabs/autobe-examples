import { IEconomicPoliticalDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicPoliticalDiscussionBoardUserSessionAtSummaryTransformer } from "../transformers/EconomicPoliticalDiscussionBoardUserSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalDiscussionBoardUserSessions(props: {
  user: UserPayload;
  body: IEconomicPoliticalDiscussionBoardUserSession.IRequest;
}): Promise<IPageIEconomicPoliticalDiscussionBoardUserSession.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = props.body.limit ?? props.body.size ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.economic_political_discussion_board_user_sessionsWhereInput =
    {
      user_id: props.user.id,
      expired_at: { gt: new Date() },
      ...(props.body.ip !== undefined &&
        props.body.ip !== null && { ip: props.body.ip }),
    };
  const orderByInput =
    props.body.sortBy === "expired_at_asc"
      ? { expired_at: "asc" as const }
      : { created_at: "desc" as const };
  const data =
    await MyGlobal.prisma.economic_political_discussion_board_user_sessions.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...EconomicPoliticalDiscussionBoardUserSessionAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.economic_political_discussion_board_user_sessions.count(
      {
        where,
      },
    );
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomicPoliticalDiscussionBoardUserSessionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEconomicPoliticalDiscussionBoardUserSession.ISummary;
}
