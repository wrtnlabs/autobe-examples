import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceSellerEmailVerificationAtSummaryTransformer } from "../transformers/EcommerceSellerEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerSellerEmailVerifications(props: {
  seller: SellerPayload;
  body: IEcommerceSellerEmailVerification.IRequest;
}): Promise<IPageIEcommerceSellerEmailVerification.ISummary> {
  const pageSize = props.body.pageSize ?? 100;
  const cursor = props.body.cursor;
  if (pageSize > 100 || pageSize < 1) {
    throw new HttpException("Page size must be between 1 and 100", 400);
  }
  const where: Prisma.ecommerce_seller_email_verificationsWhereInput = {
    deleted_at: null,
  };
  if (props.body.is_verified !== undefined) {
    where.is_verified = props.body.is_verified;
  }
  if (
    props.body.expires_at_min !== undefined ||
    props.body.expires_at_max !== undefined
  ) {
    where.expires_at = {
      gte: props.body.expires_at_min,
      lte: props.body.expires_at_max,
    };
  }
  if (
    props.body.created_at_min !== undefined ||
    props.body.created_at_max !== undefined
  ) {
    where.created_at = {
      gte: props.body.created_at_min,
      lte: props.body.created_at_max,
    };
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_seller_email_verifications.findMany({
      where: cursor ? { ...where, id: { gt: cursor } } : where,
      take: pageSize,
      select: {
        id: true,
        token: true,
        expires_at: true,
        is_verified: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            updated_at: true,
          },
        },
      },
      orderBy: [{ expires_at: "desc" }, { created_at: "desc" }],
    }),
    MyGlobal.prisma.ecommerce_seller_email_verifications.count({ where }),
  ]);
  // Add the missing ecommerce_seller_profiles field to each seller object
  const dataWithMissingFields = data.map((item) => ({
    ...item,
    seller: {
      ...item.seller,
      ecommerce_seller_profiles: null,
    },
  }));
  const transformedData = await ArrayUtil.asyncMap(
    dataWithMissingFields,
    EcommerceSellerEmailVerificationAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: 1,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: transformedData,
  };
}
