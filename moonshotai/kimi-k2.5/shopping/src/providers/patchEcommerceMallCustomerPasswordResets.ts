import { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallSellerPasswordResetAtSummaryTransformer } from "../transformers/EcommerceMallSellerPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerPasswordResets(props: {
  customer: CustomerPayload;
  body: IEcommerceMallSellerPasswordReset.IRequest;
}): Promise<IPageIEcommerceMallSellerPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const now = new Date().toISOString();
  const whereInput: Prisma.ecommerce_mall_seller_password_resetsWhereInput = {
    ...(props.body.status === "expired" && { expires_at: { lt: now } }),
    ...(props.body.status === "valid" && { expires_at: { gte: now } }),
    ...(props.body.startDate || props.body.endDate
      ? {
          created_at: {
            ...(props.body.startDate && { gte: props.body.startDate }),
            ...(props.body.endDate && { lte: props.body.endDate }),
          },
        }
      : {}),
  };
  const orderByInput = (
    props.body.sort === "createdAt_ASC"
      ? { created_at: "asc" as const }
      : props.body.sort === "expiresAt_DESC"
        ? { expires_at: "desc" as const }
        : props.body.sort === "expiresAt_ASC"
          ? { expires_at: "asc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_seller_password_resetsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallSellerPasswordResetAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_password_resets.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerPasswordResetAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
