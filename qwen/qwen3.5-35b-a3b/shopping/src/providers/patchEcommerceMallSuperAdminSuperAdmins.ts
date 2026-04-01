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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "../transformers/EcommerceMallSuperAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminSuperAdmins(props: {
  superAdmin: SuperAdminPayload;
  body: IEcommerceMallSuperAdmin.IRequest;
}): Promise<IPageIEcommerceMallSuperAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.filterEmail !== undefined && {
      email: { contains: props.body.filterEmail, mode: "insensitive" as const },
    }),
    ...(props.body.filterDisplayName !== undefined && {
      display_name: {
        contains: props.body.filterDisplayName,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.filterFullName !== undefined && {
      full_name: {
        contains: props.body.filterFullName,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.filterStatus !== undefined && {
      status: props.body.filterStatus,
    }),
    ...(props.body.filterGradeMin !== undefined && {
      grade: { gte: props.body.filterGradeMin },
    }),
    ...(props.body.filterGradeMax !== undefined && {
      grade: { lte: props.body.filterGradeMax },
    }),
    ...(props.body.filterCreatedAtStart !== undefined && {
      created_at: { gte: new Date(props.body.filterCreatedAtStart) },
    }),
    ...(props.body.filterCreatedAtEnd !== undefined && {
      created_at: { lte: new Date(props.body.filterCreatedAtEnd) },
    }),
  } satisfies Prisma.ecommerce_mall_super_adminsWhereInput;
  const orderByInput = (
    props.body.sortBy === "grade"
      ? { grade: props.body.sortOrder === "descending" ? "desc" : "asc" }
      : props.body.sortBy === "status"
        ? { status: props.body.sortOrder === "descending" ? "desc" : "asc" }
        : { created_at: props.body.sortOrder === "descending" ? "desc" : "asc" }
  ) satisfies Prisma.ecommerce_mall_super_adminsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_super_admins.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallSuperAdminAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_super_admins.count({ where: whereInput }),
  ]);
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
