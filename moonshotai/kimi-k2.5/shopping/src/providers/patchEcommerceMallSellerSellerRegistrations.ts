import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerRegistrationAtSummaryTransformer } from "../transformers/EcommerceMallSellerRegistrationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSellerRegistrations(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerRegistration.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistration.ISummary> {
  const limit = props.body.limit;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_seller_registrationsWhereInput = {
    ...(props.body.status !== null && { status: props.body.status }),
    ...(props.body.sellerId !== null && { seller_id: props.body.sellerId }),
    ...(props.body.reviewerId !== null && {
      reviewer_id: props.body.reviewerId,
    }),
    ...(props.body.createdAtFrom !== null || props.body.createdAtTo !== null
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== null && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== null && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.reviewedAtFrom !== null || props.body.reviewedAtTo !== null
      ? {
          reviewed_at: {
            ...(props.body.reviewedAtFrom !== null && {
              gte: new Date(props.body.reviewedAtFrom),
            }),
            ...(props.body.reviewedAtTo !== null && {
              lte: new Date(props.body.reviewedAtTo),
            }),
          },
        }
      : {}),
  };
  const orderByInput: Prisma.ecommerce_mall_seller_registrationsOrderByWithRelationInput =
    props.body.sortBy === "reviewedAt"
      ? { reviewed_at: props.body.sortOrder ?? "desc" }
      : props.body.sortBy === "updatedAt"
        ? { updated_at: props.body.sortOrder ?? "desc" }
        : props.body.sortBy === "status"
          ? { status: props.body.sortOrder ?? "desc" }
          : { created_at: props.body.sortOrder ?? "desc" };
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallSellerRegistrationAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_seller_registrations.count(
    {
      where: whereInput,
    },
  );
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerRegistrationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
