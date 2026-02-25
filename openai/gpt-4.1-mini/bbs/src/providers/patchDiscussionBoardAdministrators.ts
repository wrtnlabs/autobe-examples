import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministrators(props: {
  body: IDiscussionBoardAdministrator.IRequest;
}): Promise<IPageIDiscussionBoardAdministrator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_administratorsWhereInput = {};
  const andConditions =
    [] as Prisma.discussion_board_administratorsWhereInput[];
  if (props.body.email !== undefined) {
    andConditions.push({
      email: { contains: props.body.email, mode: "insensitive" },
    });
  }
  if (props.body.grade_id !== undefined) {
    andConditions.push({ grade_id: props.body.grade_id });
  }
  if (props.body.created_at_start !== undefined) {
    andConditions.push({ created_at: { gte: props.body.created_at_start } });
  }
  if (props.body.created_at_end !== undefined) {
    andConditions.push({ created_at: { lte: props.body.created_at_end } });
  }
  if (props.body.active !== undefined) {
    if (props.body.active) {
      andConditions.push({ deleted_at: null });
    } else {
      andConditions.push({ NOT: { deleted_at: null } });
    }
  }
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }
  const records =
    await MyGlobal.prisma.discussion_board_administrators.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        grade: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const total = await MyGlobal.prisma.discussion_board_administrators.count({
    where,
  });
  const transformRecord = (
    record: (typeof records)[0],
  ): IDiscussionBoardAdministrator.ISummary => {
    return {
      id: record.id,
      email: record.email,
      grade: {
        id: record.grade.id,
        name: record.grade.name,
        level: record.grade.level,
      },
      created_at: toISOStringSafe(record.created_at) as unknown as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(record.updated_at) as unknown as string &
        tags.Format<"date-time">,
      deleted_at:
        record.deleted_at === null
          ? null
          : (toISOStringSafe(record.deleted_at) as unknown as
              | (string & tags.Format<"date-time">)
              | null),
    };
  };
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: records.map(transformRecord),
  };
}
