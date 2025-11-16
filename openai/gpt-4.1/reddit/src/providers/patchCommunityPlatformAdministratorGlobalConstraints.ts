import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformGlobalConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGlobalConstraint";
import { IPageICommunityPlatformGlobalConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGlobalConstraint";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorGlobalConstraints(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformGlobalConstraint.IRequest;
}): Promise<IPageICommunityPlatformGlobalConstraint.ISummary> {
  const { constraint_key, constraint_type, q, offset, limit, order_by, order } =
    props.body;

  // Build Prisma where condition
  const where = {
    deleted_at: null,
    ...(constraint_key ? { constraint_key } : {}),
    ...(constraint_type ? { constraint_type } : {}),
    ...(q
      ? {
          OR: [
            { description: { contains: q } },
            { constraint_key: { contains: q } },
            { constraint_value: { contains: q } },
          ],
        }
      : {}),
  };

  // Correctly build orderBy with a computed property name
  const orderBy = { [order_by]: order };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_global_constraints.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.community_platform_global_constraints.count({ where }),
  ]);

  return {
    pagination: {
      current: Math.floor(offset / limit) + 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      constraint_key: item.constraint_key,
      constraint_type: item.constraint_type,
      constraint_value: item.constraint_value,
      description: item.description === null ? null : item.description,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at === null ? undefined : toISOStringSafe(item.deleted_at),
    })),
  };
}
