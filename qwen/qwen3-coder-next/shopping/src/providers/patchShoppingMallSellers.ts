import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellers(props: {
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sellersWhereInput = {
    ...(props.body.search && {
      shop_name: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.approval_status && {
      approval_status: props.body.approval_status,
    }),
  } satisfies Prisma.shopping_mall_sellersWhereInput;
  const orderByInput = (
    props.body.sort === "shop_name:asc"
      ? { shop_name: "asc" as const }
      : props.body.sort === "created_at:asc"
        ? { created_at: "asc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_sellersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      shop_name: true,
      approval_status: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({ where });
  return {
    data: data.map((seller) => ({
      id: seller.id as string & tags.Format<"uuid">,
      shop_name: seller.shop_name,
      approval_status: seller.approval_status,
      created_at: toISOStringSafe(seller.created_at),
    })),
    pagination: {
      current: (page - 1 < 0 ? 0 : page) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  };
}
