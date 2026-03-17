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
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_super_adminsWhereInput = {
    deleted_at: null,
  };
  if (props.body.filterEmail !== undefined) {
    whereInput.email = {
      contains: props.body.filterEmail,
      mode: "insensitive",
    };
  }
  if (props.body.filterDisplayName !== undefined) {
    whereInput.display_name = {
      contains: props.body.filterDisplayName,
      mode: "insensitive",
    };
  }
  if (props.body.filterFullName !== undefined) {
    whereInput.full_name = {
      contains: props.body.filterFullName,
      mode: "insensitive",
    };
  }
  if (props.body.filterStatus !== undefined) {
    whereInput.status = props.body.filterStatus;
  }
  if (
    props.body.filterGradeMin !== undefined ||
    props.body.filterGradeMax !== undefined
  ) {
    if (
      props.body.filterGradeMin !== undefined &&
      props.body.filterGradeMax !== undefined
    ) {
      whereInput.grade = {
        gte: props.body.filterGradeMin,
        lte: props.body.filterGradeMax,
      };
    } else if (props.body.filterGradeMin !== undefined) {
      whereInput.grade = { gte: props.body.filterGradeMin };
    } else {
      whereInput.grade = { lte: props.body.filterGradeMax };
    }
  }
  if (
    props.body.filterCreatedAtStart !== undefined ||
    props.body.filterCreatedAtEnd !== undefined
  ) {
    if (
      props.body.filterCreatedAtStart !== undefined &&
      props.body.filterCreatedAtEnd !== undefined
    ) {
      whereInput.created_at = {
        gte: props.body.filterCreatedAtStart,
        lte: props.body.filterCreatedAtEnd,
      };
    } else if (props.body.filterCreatedAtStart !== undefined) {
      whereInput.created_at = { gte: props.body.filterCreatedAtStart };
    } else {
      whereInput.created_at = { lte: props.body.filterCreatedAtEnd };
    }
  }
  const orderByInput = (
    props.body.sortBy === "created_at"
      ? { created_at: props.body.sortOrder === "descending" ? "desc" : "asc" }
      : props.body.sortBy === "grade"
        ? { grade: props.body.sortOrder === "descending" ? "desc" : "asc" }
        : props.body.sortBy === "status"
          ? { status: props.body.sortOrder === "descending" ? "desc" : "asc" }
          : { created_at: "desc" }
  ) satisfies Prisma.ecommerce_mall_super_adminsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_super_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [orderByInput],
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
