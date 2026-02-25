import { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardHealthCheck";
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

export async function patchDiscussionBoardSuperAdministratorHealthChecks(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardHealthCheck.IRequest;
}): Promise<IPageIDiscussionBoardHealthCheck.ISummary> {
  const page =
    typeof props.body.page === "number" && props.body.page >= 1
      ? props.body.page
      : 1;
  const limit =
    typeof props.body.limit === "number" &&
    props.body.limit >= 1 &&
    props.body.limit <= 100
      ? props.body.limit
      : 100;
  const where = {
    deleted_at: null,
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.checkedAfter
      ? { checked_at: { gte: props.body.checkedAfter } }
      : {}),
    ...(props.body.checkedBefore
      ? { checked_at: { lte: props.body.checkedBefore } }
      : {}),
  } satisfies Prisma.discussion_board_health_checksWhereInput;
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.discussion_board_health_checks.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy: { checked_at: "desc" },
    },
  );
  const total = await MyGlobal.prisma.discussion_board_health_checks.count({
    where,
  });
  const data = records.map((record) => ({
    id: record.id,
    status: record.status,
    checkedAt: record.checked_at.toISOString(),
    details: record.details === undefined ? null : record.details,
    createdAt: record.created_at.toISOString(),
  }));
  return {
    data: data as IDiscussionBoardHealthCheck.ISummary[],
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
