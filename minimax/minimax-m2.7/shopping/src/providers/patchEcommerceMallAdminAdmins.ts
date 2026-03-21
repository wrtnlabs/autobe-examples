import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminAtSummaryTransformer } from "../transformers/EcommerceMallAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdmins(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdmin.IRequest;
}): Promise<IPageIEcommerceMallAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const status = props.body.status ?? "active";
  const whereCondition = {
    deleted_at: status === "active" ? null : { not: null },
    ...(props.body.search && {
      OR: [
        {
          email: { contains: props.body.search, mode: "insensitive" as const },
        },
        { name: { contains: props.body.search, mode: "insensitive" as const } },
      ],
    }),
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" as const },
    }),
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" as const },
    }),
  } satisfies Prisma.ecommerce_mall_adminsWhereInput;
  const admins = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
    where: whereCondition,
    skip: skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_admins.count({
    where: whereCondition,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      admins,
      EcommerceMallAdminAtSummaryTransformer.transform,
    ),
  };
}
