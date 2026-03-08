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
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build filter criteria
  const whereInput: Prisma.ecommerce_mall_adminsWhereInput = {
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.is_banned !== null &&
      props.body.is_banned !== undefined && {
        is_banned: props.body.is_banned,
      }),
    ...(props.body.created_at_gte && {
      created_at: { gte: new Date(props.body.created_at_gte) },
    }),
    ...(props.body.created_at_lte && {
      created_at: { lte: new Date(props.body.created_at_lte) },
    }),
    ...(props.body.updated_at_gte && {
      updated_at: { gte: new Date(props.body.updated_at_gte) },
    }),
    ...(props.body.updated_at_lte && {
      updated_at: { lte: new Date(props.body.updated_at_lte) },
    }),
  } satisfies Prisma.ecommerce_mall_adminsWhereInput;
  // Get requesting admin's record to check if banned
  const requestingAdmin =
    await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
      where: { id: props.admin.id },
    });
  if (requestingAdmin === null || requestingAdmin.is_banned === true) {
    throw new HttpException("Forbidden", 403);
  }
  // Build order by clause
  const orderByInput: Prisma.ecommerce_mall_adminsOrderByWithRelationInput[] = [
    {
      ...(props.body.sort_by === "email"
        ? { email: (props.body.sort_order ?? "asc") as "asc" | "desc" }
        : props.body.sort_by === "created_at"
          ? { created_at: (props.body.sort_order ?? "asc") as "asc" | "desc" }
          : props.body.sort_by === "updated_at"
            ? { updated_at: (props.body.sort_order ?? "asc") as "asc" | "desc" }
            : { id: (props.body.sort_order ?? "asc") as "asc" | "desc" }),
    },
  ] satisfies Prisma.ecommerce_mall_adminsOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_admins.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallAdminAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
