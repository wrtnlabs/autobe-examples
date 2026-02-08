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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorAdministratorRequests(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAdministratorRequest.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorRequest.ISummary> {
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_administrators.findUnique({
      where: { id: props.administrator.id },
      select: { id: true },
    });
  if (!superAdmin) throw new HttpException("Forbidden", 403);
  const currentPage = 1;
  const currentLimit = 100;
  const skip = 0;
  const whereFilter: Prisma.discussion_board_administrator_requestsWhereInput =
    {
      deleted_at: null,
    };
  const requests =
    await MyGlobal.prisma.discussion_board_administrator_requests.findMany({
      where: whereFilter,
      skip,
      take: currentLimit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        status: true,
        reason: true,
        created_at: true,
        updated_at: true,
        registered_user_id: true,
      },
    });
  const total =
    await MyGlobal.prisma.discussion_board_administrator_requests.count({
      where: whereFilter,
    });
  const pages = Math.ceil(total / currentLimit);
  const data = requests.map((req) => ({
    id: req.id,
    status: req.status,
    reason: req.reason,
    created_at: toISOStringSafe(req.created_at),
    updated_at: toISOStringSafe(req.updated_at),
    registered_user_id: req.registered_user_id,
  }));
  return {
    pagination: {
      current: currentPage,
      limit: currentLimit,
      records: total,
      pages,
    },
    data,
  };
}
