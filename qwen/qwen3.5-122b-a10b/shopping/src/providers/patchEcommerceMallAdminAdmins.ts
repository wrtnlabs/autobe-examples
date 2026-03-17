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
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_adminsWhereInput = {
    deleted_at: null,
    ...(props.body.email && {
      email: {
        contains: props.body.email,
        mode: "insensitive",
      },
    }),
    ...(props.body.account_status && {
      account_status: props.body.account_status,
    }),
    ...(props.body.admin_grade && {
      admin_grade: props.body.admin_grade,
    }),
  } satisfies Prisma.ecommerce_mall_adminsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_adminsOrderByWithRelationInput[] = [
    {
      [props.body.sort ?? "created_at"]: props.body.order ?? "desc",
    },
  ] satisfies Prisma.ecommerce_mall_adminsOrderByWithRelationInput[];
  const [admins, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_admins.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallAdminAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_admins.count({ where: whereInput }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      admins,
      EcommerceMallAdminAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallAdmin.ISummary;
}
