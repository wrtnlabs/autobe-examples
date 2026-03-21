import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminAdmins(props: {
  admin: AdminPayload;
  body: IErpHrmAdmin.IRequest;
}): Promise<IPageIErpHrmAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    AND: (
      [
        props.body.email !== undefined && {
          email: { contains: props.body.email, mode: "insensitive" as const },
        },
        props.body.displayName !== undefined && {
          display_name: {
            contains: props.body.displayName,
            mode: "insensitive" as const,
          },
        },
        props.body.phone !== undefined && {
          phone: props.body.phone,
        },
      ] as (Prisma.erp_hrm_adminsWhereInput | false | null | undefined)[]
    ).filter(
      (item): item is Prisma.erp_hrm_adminsWhereInput =>
        item !== false && item !== null && item !== undefined,
    ),
  } satisfies Prisma.erp_hrm_adminsWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_uri: true,
      phone: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.erp_hrm_admins.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (item): IErpHrmAdmin.ISummary => ({
        id: item.id,
        email: item.email,
        display_name: item.display_name,
        avatar_uri: item.avatar_uri,
        phone: item.phone,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
      }),
    ),
  };
}
