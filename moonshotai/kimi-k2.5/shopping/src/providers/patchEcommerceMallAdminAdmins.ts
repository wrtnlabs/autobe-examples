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
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const createdAtCondition: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (
    props.body.createdAtMin !== undefined &&
    props.body.createdAtMin !== null
  ) {
    createdAtCondition.gte = new Date(props.body.createdAtMin);
  }
  if (
    props.body.createdAtMax !== undefined &&
    props.body.createdAtMax !== null
  ) {
    createdAtCondition.lte = new Date(props.body.createdAtMax);
  }
  const whereInput = {
    ...(props.body.grade !== undefined &&
      props.body.grade !== null && { grade: props.body.grade }),
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        nickname: { contains: props.body.search },
      }),
    ...(props.body.email !== undefined &&
      props.body.email !== null && {
        email: { contains: props.body.email },
      }),
    ...(Object.keys(createdAtCondition).length > 0 && {
      created_at: createdAtCondition,
    }),
    ...(props.body.includeDeleted !== true && { deleted_at: null }),
  } satisfies Prisma.ecommerce_mall_adminsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_adminsOrderByWithRelationInput =
    sortBy === "grade"
      ? { grade: sortOrder }
      : sortBy === "status"
        ? { status: sortOrder }
        : { created_at: sortOrder };
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
