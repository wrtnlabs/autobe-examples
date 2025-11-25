import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import { IPageICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdministrator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorAdministrators(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformAdministrator.IRequest;
}): Promise<IPageICommunityPlatformAdministrator.ISummary> {
  const {
    status,
    email,
    business_status,
    created_from,
    created_to,
    page,
    limit,
    sort_by,
    sort_direction,
  } = props.body;

  const where = {
    ...(status != null && { status }),
    ...(business_status != null && { business_status }),
    ...(email != null && {
      email: {
        contains: email,
        mode: Prisma.QueryMode.insensitive,
      },
    }),
    ...(created_from || created_to
      ? {
          created_at: {
            ...(created_from ? { gte: created_from } : {}),
            ...(created_to ? { lte: created_to } : {}),
          },
        }
      : {}),
    deleted_at: null,
  };

  const sortField = sort_by ?? "created_at";
  const sortDirection = sort_direction ?? "desc";
  const skip = (page - 1) * limit;

  const [admins, total] = await Promise.all([
    MyGlobal.prisma.community_platform_administrators.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortField]: sortDirection,
      },
      select: {
        id: true,
      },
    }),
    MyGlobal.prisma.community_platform_administrators.count({ where }),
  ]);

  const data = admins.map((admin) => ({ id: admin.id }));
  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data,
  };
}
