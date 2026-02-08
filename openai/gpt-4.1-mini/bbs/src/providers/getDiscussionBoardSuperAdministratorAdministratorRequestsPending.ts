import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdministratorAdministratorRequestsPending(props: {
  superAdministrator: SuperadministratorPayload;
}): Promise<IPageIDiscussionBoardAdministratorRequest.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const where = { status: "pending" };
  const [requests, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_administrator_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_administrator_requests.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: requests.map(() => ({})),
  };
}
