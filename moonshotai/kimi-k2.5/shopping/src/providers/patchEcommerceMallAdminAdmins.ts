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
  const limit = props.body.limit ?? 20;
  const page = (props.body.page ?? 1) < 1 ? 1 : (props.body.page ?? 1);
  const sort = props.body.sort ?? "-created_at";
  // Build where clause for filters
  const whereInput: Prisma.ecommerce_mall_adminsWhereInput = {
    deleted_at: null,
    ...(props.body.grade !== undefined && { grade: props.body.grade }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.nickname !== undefined && {
      nickname: { contains: props.body.nickname, mode: "insensitive" },
    }),
  };
  // Build orderBy based on sort parameter
  let orderByInput: Prisma.ecommerce_mall_adminsOrderByWithRelationInput;
  if (sort === "created_at") {
    orderByInput = { created_at: "asc" };
  } else if (sort === "-created_at") {
    orderByInput = { created_at: "desc" };
  } else if (sort === "grade") {
    orderByInput = { grade: "asc" };
  } else {
    orderByInput = { grade: "desc" };
  }
  // Calculate skip for pagination
  const skip = (page - 1) * limit;
  // Query administrators with filters, sorting, and pagination
  const admins = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EcommerceMallAdminAtSummaryTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.ecommerce_mall_admins.count({
    where: whereInput,
  });
  // Transform results using transformer
  const data = await ArrayUtil.asyncMap(
    admins,
    EcommerceMallAdminAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
