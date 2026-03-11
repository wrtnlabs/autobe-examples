import { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminRoleAtSummaryTransformer } from "../transformers/EcommerceMallAdminRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminRoles(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminRole.IRequest;
}): Promise<IPageIEcommerceMallAdminRole.ISummary> {
  await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: props.admin.id },
    select: { grade: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_admin_rolesWhereInput = {
    AND: [
      ...(props.body.admin_id ? [{ admin_id: props.body.admin_id }] : []),
      ...(props.body.grade ? [{ grade: props.body.grade }] : []),
      ...(props.body.created_at_from
        ? [{ created_at: { gte: props.body.created_at_from } }]
        : []),
      ...(props.body.created_at_to
        ? [{ created_at: { lte: props.body.created_at_to } }]
        : []),
    ],
  } satisfies Prisma.ecommerce_mall_admin_rolesWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_admin_roles.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      admin: true,
      created_at: true,
      updated_at: true,
      grade: true,
      adminRequests: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_admin_roles.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallAdminRoleAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
