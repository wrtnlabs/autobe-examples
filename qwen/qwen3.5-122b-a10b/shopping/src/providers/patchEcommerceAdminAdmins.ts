import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceAdminAtSummaryTransformer } from "../transformers/EcommerceAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminAdmins(props: {
  admin: AdminPayload;
  body: IEcommerceAdmin.IRequest;
}): Promise<IPageIEcommerceAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_adminsWhereInput = {
    ...(props.body.status === "active" && { deleted_at: null }),
    ...(props.body.status === "deleted" && { deleted_at: { not: null } }),
    ...(props.body.email && {
      email: {
        contains: props.body.email,
        mode: "insensitive",
      },
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.updated_at_from && {
      updated_at: {
        gte: new Date(props.body.updated_at_from),
      },
    }),
    ...(props.body.updated_at_to && {
      updated_at: {
        lte: new Date(props.body.updated_at_to),
      },
    }),
    ...(props.body.grade && {
      administratorGrade: {
        grade: props.body.grade,
      },
    }),
  } satisfies Prisma.ecommerce_adminsWhereInput;
  const orderByInput: Prisma.ecommerce_adminsOrderByWithRelationInput =
    props.body.sort_by === "email"
      ? { email: (props.body.sort_order ?? "desc") as Prisma.SortOrder }
      : props.body.sort_by === "updated_at"
        ? { updated_at: (props.body.sort_order ?? "desc") as Prisma.SortOrder }
        : { created_at: (props.body.sort_order ?? "desc") as Prisma.SortOrder };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_admins.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceAdminAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_admins.count({
      where: whereInput,
    }),
  ]);
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceAdminAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceAdmin.ISummary;
}
