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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminAtSummaryTransformer } from "../transformers/EcommerceMallAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdmins(props: {
  superAdmin: SuperadminPayload;
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
      contains: props.body.search.toLowerCase(),
      mode: "insensitive",
    };
  }
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.startDate !== undefined && props.body.endDate !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.startDate),
      lte: new Date(props.body.endDate),
    };
  } else if (props.body.startDate !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.startDate),
    };
  } else if (props.body.endDate !== undefined) {
    whereInput.created_at = {
      lte: new Date(props.body.endDate),
    };
  }
  const orderByInput: Prisma.ecommerce_mall_adminsOrderByWithRelationInput =
    props.body.sortBy === "email"
      ? { email: props.body.sortOrder ?? ("asc" as const) }
      : props.body.sortBy === "status"
        ? { status: props.body.sortOrder ?? ("asc" as const) }
        : { created_at: props.body.sortOrder === "asc" ? "asc" : "desc" };
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
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallAdminAtSummaryTransformer.transform,
    ),
  } as IPageIEcommerceMallAdmin.ISummary;
}
