import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellers(props: {
  body: IEcommerceMallSeller.IRequest;
}): Promise<IPageIEcommerceMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const createdAtFilter: Prisma.DateTimeFilter | undefined =
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          ...(props.body.created_at_from !== undefined &&
            props.body.created_at_from !== null && {
              gte: new Date(props.body.created_at_from),
            }),
          ...(props.body.created_at_to !== undefined &&
            props.body.created_at_to !== null && {
              lte: new Date(props.body.created_at_to),
            }),
        }
      : undefined;
  const whereInput = {
    deleted_at: null,
    ...(props.body.approval_status !== undefined &&
      props.body.approval_status !== null && {
        approval_status: props.body.approval_status,
      }),
    ...(props.body.email !== undefined &&
      props.body.email !== null && {
        email: { contains: props.body.email, mode: "insensitive" as const },
      }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  } satisfies Prisma.ecommerce_mall_sellersWhereInput;
  const sellers = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      approval_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where: whereInput,
  });
  const data: IEcommerceMallSeller.ISummary[] = sellers.map((seller) => ({
    id: seller.id,
    email: seller.email,
    shopName: "",
    approvalStatus: seller.approval_status,
    createdAt: seller.created_at.toISOString(),
    updatedAt: seller.updated_at.toISOString(),
    deletedAt: seller.deleted_at?.toISOString() ?? null,
  }));
  return {
    data,
    pagination: {
      current: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  };
}
