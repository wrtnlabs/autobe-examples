import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminDiscussionBoardAdmins(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdmin.IRequest;
}): Promise<IPageIDiscussionBoardAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Construct where clause
  const where: any = {
    AND: [],
  };

  if (props.body.search) {
    where.AND.push({
      OR: [
        { email: { contains: props.body.search, mode: "insensitive" } },
        { nickname: { contains: props.body.search, mode: "insensitive" } },
      ],
    });
  }

  if (props.body.email) {
    where.AND.push({ email: props.body.email });
  }

  if (props.body.nickname) {
    where.AND.push({ nickname: props.body.nickname });
  }

  if (props.body.created_at_from || props.body.created_at_to) {
    const gte = props.body.created_at_from;
    const lte = props.body.created_at_to;
    where.AND.push({
      created_at: {
        ...(gte && { gte }),
        ...(lte && { lte }),
      },
    });
  }

  if (typeof props.body.deleted_at_is_null === "boolean") {
    if (props.body.deleted_at_is_null) {
      where.AND.push({ deleted_at: null });
    } else {
      where.AND.push({ NOT: { deleted_at: null } });
    }
  }

  // Remove AND if empty
  if (where.AND.length === 0) {
    delete where.AND;
  }

  // Query database
  const [admins, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admin.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_admin.count({ where }),
  ]);

  // Map data
  const data: IDiscussionBoardAdmin.ISummary[] = admins.map((admin) => ({
    id: admin.id,
    email: admin.email,
    nickname: admin.nickname,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
