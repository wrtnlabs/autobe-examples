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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerEmailVerificationAtSummaryTransformer } from "../transformers/EcommerceMallSellerEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminEmailVerifications(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerEmailVerification.IRequest;
}): Promise<IPageIEcommerceMallSellerEmailVerification.ISummary> {
  const page = props.body.page ? Math.max(1, parseInt(props.body.page, 10)) : 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_seller_email_verificationsWhereInput =
    {
      deleted_at: null,
      ...(props.body.email !== undefined && {
        seller: {
          email: props.body.email,
        },
      }),
      ...(props.body.created_after !== undefined && {
        created_at: {
          gte: new Date(props.body.created_after),
        },
      }),
      ...(props.body.created_before !== undefined && {
        created_at: {
          lte: new Date(props.body.created_before),
        },
      }),
      ...(props.body.expires_before !== undefined && {
        expires_at: {
          lte: new Date(props.body.expires_before),
        },
      }),
      ...(props.body.used_after !== undefined &&
        props.body.used_after !== null && {
          OR: [
            {
              used_at: {
                not: null,
                gte: new Date(props.body.used_after),
              },
            },
            {
              used_at: null,
            },
          ],
        }),
      ...(props.body.used_before !== undefined &&
        props.body.used_before !== null && {
          OR: [
            {
              used_at: {
                not: null,
                lte: new Date(props.body.used_before),
              },
            },
            {
              used_at: null,
            },
          ],
        }),
      ...(props.body.seller_id !== undefined && {
        seller_id: props.body.seller_id,
      }),
    };
  const orderByInput:
    | Prisma.ecommerce_mall_seller_email_verificationsOrderByWithRelationInput
    | Prisma.ecommerce_mall_seller_email_verificationsOrderByWithRelationInput[] =
    props.body.sort_by === "created_at"
      ? { created_at: props.body.sort_order === "ASC" ? "asc" : "desc" }
      : props.body.sort_by === "expires_at"
        ? { expires_at: props.body.sort_order === "ASC" ? "asc" : "desc" }
        : props.body.sort_by === "used_at"
          ? { used_at: props.body.sort_order === "ASC" ? "asc" : "desc" }
          : props.body.sort_by === "email"
            ? {
                seller: {
                  email: props.body.sort_order === "ASC" ? "asc" : "desc",
                },
              }
            : { created_at: "desc" };
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_email_verifications.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
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
    },
  };
}
