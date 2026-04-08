import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "../transformers/EcommerceMallSuperAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminSuperAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallSuperAdmin.IRequest;
}): Promise<IPageIEcommerceMallSuperAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_super_adminsWhereInput = {
    ...(props.body.email &&
      props.body.email.length >= 3 && {
        email: {
          contains: props.body.email,
          mode: "insensitive" as const,
        },
      }),
    ...((props.body.createdAtFrom || props.body.createdAtTo) && {
      created_at: {
        ...(props.body.createdAtFrom && { gte: props.body.createdAtFrom }),
        ...(props.body.createdAtTo && { lte: props.body.createdAtTo }),
      },
    }),
  };
  const data = await MyGlobal.prisma.ecommerce_mall_super_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallSuperAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_super_admins.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSuperAdminAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
