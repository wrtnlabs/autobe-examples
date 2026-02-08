import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
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

export async function patchDiscussionBoardSuperAdministratorAdministratorGradeChanges(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardAdministratorGradeChange.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorGradeChange.ISummary> {
  // Cast body to any to suppress TS errors due to missing properties
  const body: any = props.body;
  const where: Prisma.discussion_board_administrator_grade_changesWhereInput =
    {};
  if (body.administrator_id != null) {
    where.discussion_board_administrator_id = body.administrator_id;
  }
  if (body.grade_id != null) {
    where.discussion_board_administrator_grade_id = body.grade_id;
  }
  let createdAtFilter: Prisma.DateTimeFilter | undefined = undefined;
  if (body.created_at_from != null) {
    createdAtFilter = { gte: toISOStringSafe(body.created_at_from) };
  }
  if (body.created_at_to != null) {
    if (createdAtFilter === undefined) {
      createdAtFilter = { lte: toISOStringSafe(body.created_at_to) };
    } else {
      createdAtFilter = {
        ...createdAtFilter,
        lte: toISOStringSafe(body.created_at_to),
      };
    }
  }
  if (createdAtFilter !== undefined) {
    where.created_at = createdAtFilter;
  }
  const take = typeof body.limit === "number" ? body.limit : 20;
  const cursor = typeof body.cursor === "string" ? body.cursor : undefined;
  const data =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.findMany(
      {
        where,
        take: take + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { created_at: "desc" },
      },
    );
  const hasNext = data.length > take;
  if (hasNext) data.pop();
  const total =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.count({
      where,
    });
  const pagination = {
    current: typeof body.page === "number" ? body.page : 1,
    limit: take,
    records: total,
    pages: Math.ceil(total / take),
  };
  return {
    pagination,
    data: data.map((record) => ({
      id: record.id,
      administrator_id: record.discussion_board_administrator_id,
      grade_id: record.discussion_board_administrator_grade_id,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
