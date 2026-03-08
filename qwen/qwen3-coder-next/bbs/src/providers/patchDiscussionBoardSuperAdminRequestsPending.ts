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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorRequestAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminRequestsPending(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministratorRequest.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_administrator_requestsWhereInput = {
    status: "pending",
  };
  const orderBy: Prisma.discussion_board_administrator_requestsOrderByWithRelationInput =
    {
      submitted_at: props.body.sortOrder === "asc" ? "asc" : "desc",
    };
  const data =
    await MyGlobal.prisma.discussion_board_administrator_requests.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...DiscussionBoardAdministratorRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_administrator_requests.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdministratorRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
