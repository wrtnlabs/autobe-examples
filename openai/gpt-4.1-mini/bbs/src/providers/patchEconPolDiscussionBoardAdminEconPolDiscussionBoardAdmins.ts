import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import { IPageIEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchEconPolDiscussionBoardAdminEconPolDiscussionBoardAdmins(props: {
  admin: AdminPayload;
  body: IEconPolDiscussionBoardAdmin.IRequest;
}): Promise<IPageIEconPolDiscussionBoardAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(props.body.search
      ? {
          OR: [
            {
              username: {
                contains: props.body.search,
                mode: "insensitive" satisfies "insensitive" as "insensitive",
              },
            },
            {
              email: {
                contains: props.body.search,
                mode: "insensitive" satisfies "insensitive" as "insensitive",
              },
            },
          ],
        }
      : {}),
  } satisfies {
    deleted_at: null;
    OR?: (
      | {
          username?: { contains: string; mode: "insensitive" };
          email?: undefined;
        }
      | {
          email?: { contains: string; mode: "insensitive" };
          username?: undefined;
        }
    )[];
  };

  const orderBy =
    props.body.sort_by &&
    (props.body.order === "asc" || props.body.order === "desc")
      ? ({ [props.body.sort_by]: props.body.order } satisfies Record<
          string,
          "asc" | "desc"
        >)
      : ({ created_at: "desc" } satisfies { created_at: "desc" });

  const [admins, total] = await Promise.all([
    MyGlobal.prisma.econ_pol_discussion_board_admins.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.econ_pol_discussion_board_admins.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: admins.map((admin) => ({
      id: admin.id,
      username: admin.username,
      email: admin.email,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    })),
  };
}
