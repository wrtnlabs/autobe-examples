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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallSellerRegistrationAtSummaryTransformer } from "../transformers/EcommerceMallSellerRegistrationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminSellerRegistrations(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallSellerRegistration.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistration.ISummary> {
  const limit = props.body.limit ?? 20;
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const page = props.body.page ?? 1;
  const whereInput = {
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.sellerId && { seller_id: props.body.sellerId }),
    ...(props.body.reviewerId && { reviewer_id: props.body.reviewerId }),
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.reviewedAtFrom || props.body.reviewedAtTo
      ? {
          reviewed_at: {
            ...(props.body.reviewedAtFrom && {
              gte: new Date(props.body.reviewedAtFrom),
            }),
            ...(props.body.reviewedAtTo && {
              lte: new Date(props.body.reviewedAtTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_seller_registrationsWhereInput;
  const orderByInput = (
    sortBy === "reviewedAt"
      ? { reviewed_at: sortOrder }
      : sortBy === "updatedAt"
        ? { updated_at: sortOrder }
        : sortBy === "status"
          ? { status: sortOrder }
          : { created_at: sortOrder }
  ) satisfies Prisma.ecommerce_mall_seller_registrationsOrderByWithRelationInput;
  const skip = props.body.cursor ? undefined : (page - 1) * limit;
  const cursor:
    | Prisma.ecommerce_mall_seller_registrationsWhereUniqueInput
    | undefined = props.body.cursor ? { id: props.body.cursor } : undefined;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_seller_registrations.findMany({
      where: whereInput,
      skip,
      take: limit,
      cursor,
      orderBy: orderByInput,
      ...EcommerceMallSellerRegistrationAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_seller_registrations.count({
      where: whereInput,
    }),
  ]);
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallSellerRegistrationAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
