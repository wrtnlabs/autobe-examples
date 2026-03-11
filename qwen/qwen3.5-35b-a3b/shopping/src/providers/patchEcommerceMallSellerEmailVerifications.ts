import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerEmailVerificationAtSummaryTransformer } from "../transformers/EcommerceMallSellerEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerEmailVerifications(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerEmailVerification.IRequest;
}): Promise<IPageIEcommerceMallSellerEmailVerification.ISummary> {
  const page = props.body.page ? parseInt(props.body.page, 10) : 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sellerRecord =
    await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
      where: {
        id: props.seller.id,
        deleted_at: null,
      },
      select: { email: true },
    });
  const createdAfter = props.body.created_after
    ? new Date(props.body.created_after)
    : undefined;
  const createdBefore = props.body.created_before
    ? new Date(props.body.created_before)
    : undefined;
  const expiresBefore = props.body.expires_before
    ? new Date(props.body.expires_before)
    : undefined;
  const usedAfter = props.body.used_after
    ? new Date(props.body.used_after)
    : undefined;
  const usedBefore = props.body.used_before
    ? new Date(props.body.used_before)
    : undefined;
  const whereInput: Prisma.ecommerce_mall_seller_email_verificationsWhereInput =
    {
      deleted_at: null,
      ...(createdAfter && {
        created_at: {
          gte: createdAfter,
        },
      }),
      ...(createdBefore && {
        created_at: {
          lte: createdBefore,
        },
      }),
      ...(expiresBefore && {
        expires_at: {
          lte: expiresBefore,
        },
      }),
      ...(usedAfter && {
        used_at: {
          gte: usedAfter,
        },
      }),
      ...(usedBefore && {
        used_at: {
          lte: usedBefore,
        },
      }),
      seller_id: props.seller.id,
      ...(props.body.seller_id !== undefined && {
        seller_id: props.body.seller_id,
      }),
    } satisfies Prisma.ecommerce_mall_seller_email_verificationsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_seller_email_verificationsOrderByWithRelationInput =
    props.body.sort_by
      ? {
          [props.body.sort_by]:
            props.body.sort_order === "DESC" ? "desc" : "asc",
        }
      : { created_at: "desc" };
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_email_verifications.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallSellerEmailVerificationAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_email_verifications.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerEmailVerificationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
