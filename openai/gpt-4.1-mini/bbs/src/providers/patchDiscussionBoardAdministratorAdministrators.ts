import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorAdministrators(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAdministrator.IRequest;
}): Promise<IPageIDiscussionBoardAdministrator.ISummary> {
  // Cast props.body to any to avoid TS errors due to missing properties
  const body: any = props.body;
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 10;
  const gradeId = body.grade_id ?? null;
  const email = body.email ?? null;
  const isActive = body.is_active ?? null;
  const whereConditions: Prisma.discussion_board_administratorsWhereInput = {
    ...(gradeId ? { grade_id: gradeId } : {}),
    ...(email ? { email: { contains: email, mode: "insensitive" } } : {}),
    deleted_at: isActive === null ? null : isActive ? null : { not: null },
  };
  const skip = Math.max((page - 1) * limit, 0);
  const take = limit;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_administrators.findMany({
      where: whereConditions,
      skip,
      take,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        grade: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_administrators.count({
      where: whereConditions,
    }),
  ]);
  return {
    data: data.map((admin) => ({
      id: admin.id,
      email: admin.email,
      grade: admin.grade
        ? {
            id: admin.grade.id,
            name: admin.grade.name,
            description: admin.grade.description,
          }
        : { id: "" as string & tags.Format<"uuid">, name: "", description: "" },
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
