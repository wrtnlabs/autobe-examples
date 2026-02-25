import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceSellerAtSummaryTransformer } from "../transformers/EcommerceSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminSellers(props: {
  admin: AdminPayload;
  body: IEcommerceSeller.IRequest;
}): Promise<IPageIEcommerceSeller.ISummary> {
  const { search, status, page, limit } = props.body;
  const currentPage = page ?? 1;
  const currentLimit = limit ? Math.min(limit, 100) : 10;
  const skip = (currentPage - 1) * currentLimit;
  let whereInput: Prisma.ecommerce_sellersWhereInput = {
    deleted_at: null,
  };
  if (status) {
    whereInput = { ...whereInput, status };
  }
  if (search) {
    whereInput = {
      ...whereInput,
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    };
  }
  const data = await MyGlobal.prisma.ecommerce_sellers.findMany({
    where: whereInput,
    skip,
    take: currentLimit,
    ...EcommerceSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_sellers.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceSellerAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: currentPage,
      limit: currentLimit,
      records: total,
      pages: Math.ceil(total / currentLimit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceSeller.ISummary;
}
