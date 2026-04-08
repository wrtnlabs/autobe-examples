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

export async function patchEcommerceMallSellerRegistrations(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerRegistration.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with seller restriction and optional filters
  const where: Prisma.ecommerce_mall_seller_registrationsWhereInput = {
    seller_id: props.seller.id,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.createdAt !== undefined && {
      created_at: {
        ...(props.body.createdAt.from !== undefined && {
          gte: new Date(props.body.createdAt.from),
        }),
        ...(props.body.createdAt.to !== undefined && {
          lte: new Date(props.body.createdAt.to),
        }),
      },
    }),
  } satisfies Prisma.ecommerce_mall_seller_registrationsWhereInput;
  // Query registrations with pagination
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallSellerRegistrationAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_seller_registrations.count(
    {
      where,
    },
  );
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallSellerRegistrationAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
