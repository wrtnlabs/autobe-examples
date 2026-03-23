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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerRegistrationAtSummaryTransformer } from "../transformers/EcommerceMallSellerRegistrationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSellerRegistrations(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerRegistration.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_seller_registrationsWhereInput = {
    approval_status: props.body.approval_status
      ? props.body.approval_status
      : undefined,
    ...(props.body.responded_at_from && {
      responded_at: {
        gte: toISOStringSafe(props.body.responded_at_from),
      },
    }),
    ...(props.body.responded_at_to && {
      responded_at: {
        lte: toISOStringSafe(props.body.responded_at_to),
      },
    }),
    ...(props.body.shop_name && {
      shop_name: {
        contains: props.body.shop_name,
        mode: Prisma.QueryMode.insensitive,
      },
    }),
  } satisfies Prisma.ecommerce_mall_seller_registrationsWhereInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findMany({
      where,
      skip,
      take: limit,
      orderBy: { responded_at: "desc" },
      ...EcommerceMallSellerRegistrationAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_seller_registrations.count(
    {
      where,
    },
  );
  return {
    data: await ArrayUtil.asyncMap(data, (item) => {
      const transformed =
        EcommerceMallSellerRegistrationAtSummaryTransformer.transform(item);
      return transformed;
    }),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
