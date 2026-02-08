import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGrade";
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

export async function patchDiscussionBoardAdministratorAdministratorGrades(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAdministratorGrade.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorGrade.ISummary> {
  // Since IRequest is empty, we cannot get page or limit from it, so default to values
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query data: select nothing since ISummary is empty
  const records =
    await MyGlobal.prisma.discussion_board_administrator_grades.findMany({
      where: { deleted_at: null },
      orderBy: { level: "asc" },
      skip,
      take: limit,
      select: {},
    });
  // Count total records
  const total =
    await MyGlobal.prisma.discussion_board_administrator_grades.count({
      where: { deleted_at: null },
    });
  return {
    data: records.map(() => ({})),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
