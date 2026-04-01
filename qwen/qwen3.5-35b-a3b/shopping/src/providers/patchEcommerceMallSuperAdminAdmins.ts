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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdmins(props: {
  superAdmin: SuperAdminPayload;
  body: IEcommerceMallAdmin.IRequest;
}): Promise<IPageIEcommerceMallAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_adminsWhereInput = {
    deleted_at: null,
  };
  if (props.body.search !== undefined) {
    whereInput.email = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.startDate !== undefined || props.body.endDate !== undefined) {
    whereInput.created_at = {
      ...(props.body.startDate !== undefined
        ? { gte: new Date(props.body.startDate) }
        : undefined),
      ...(props.body.endDate !== undefined
        ? { lte: new Date(props.body.endDate) }
        : undefined),
    } as Prisma.DateTimeFilter;
  }
  const sortField = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput = {
    [sortField]: sortOrder,
  } satisfies Prisma.ecommerce_mall_adminsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      email: true,
      status: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_admins.count({
    where: whereInput,
  });
  const summaryData = data.map(
    (item) =>
      ({
        id: item.id,
        email: item.email,
        status: item.status,
        created_at: toISOStringSafe(item.created_at),
      }) satisfies IEcommerceMallAdmin.ISummary,
  );
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: summaryData,
  } satisfies IPageIEcommerceMallAdmin.ISummary;
}
