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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSellers(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  // IRequest DTO has no pagination, fixed values used
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sellersWhereInput = {
    deleted_at: null,
  };
  const updateData: Prisma.shopping_mall_sellersUpdateInput = {};
  if ("shop_name" in props.body) {
    const val = props.body.shop_name;
    if (val === undefined) {
      // no assignment
    } else if (val === null) {
      updateData.shop_name = { set: null };
    } else {
      updateData.shop_name = { set: val };
    }
  }
  if ("shop_description" in props.body) {
    const val = props.body.shop_description;
    if (val === undefined) {
      // no assignment
    } else if (val === null) {
      updateData.shop_description = { set: null };
    } else {
      updateData.shop_description = { set: val };
    }
  }
  if ("logo_uri" in props.body) {
    const val = props.body.logo_uri;
    if (val === undefined) {
      // no assignment
    } else if (val === null) {
      updateData.logo_uri = { set: null };
    } else {
      updateData.logo_uri = { set: val };
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      const existingSeller = await tx.shopping_mall_sellers.findUnique({
        where: { id: props.seller.id },
      });
      if (!existingSeller) {
        throw new HttpException("Seller not found", 404);
      }
      updateData.updated_at = toISOStringSafe(new Date());
      await tx.shopping_mall_sellers.update({
        where: { id: props.seller.id },
        data: updateData,
      });
      const resolveStringOrFallback = (
        field:
          | string
          | Prisma.StringFieldUpdateOperationsInput
          | Prisma.NullableStringFieldUpdateOperationsInput
          | null
          | undefined,
      ): string => {
        if (field === null || field === undefined) {
          return "";
        }
        if (typeof field === "string") {
          return field;
        }
        if (typeof field === "object" && "set" in field) {
          return field.set ?? "";
        }
        return "";
      };
      await tx.shopping_mall_seller_profile_snapshots.create({
        data: {
          id: v4(),
          seller: { connect: { id: props.seller.id } },
          shop_name:
            resolveStringOrFallback(updateData.shop_name) ||
            existingSeller.shop_name ||
            "",
          shop_description:
            resolveStringOrFallback(updateData.shop_description) ||
            existingSeller.shop_description ||
            "",
          logo_uri:
            resolveStringOrFallback(updateData.logo_uri) ||
            existingSeller.logo_uri ||
            "",
          created_at: toISOStringSafe(new Date()),
        },
      });
    }
  });
  const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where,
    skip,
    take: limit,
    orderBy: { id: "desc" },
    select: {
      id: true,
      shop_name: true,
      shop_description: true,
      logo_uri: true,
      approval_status: true,
      rejection_reason: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({ where });
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: sellers.map((seller) => ({
      id: seller.id,
      shop_name: seller.shop_name ?? null,
      shop_description: seller.shop_description ?? null,
      logo_uri: seller.logo_uri ?? null,
      approval_status: seller.approval_status,
      rejection_reason: seller.rejection_reason ?? null,
      created_at: toISOStringSafe(seller.created_at),
    })),
  } satisfies IPageIShoppingMallSeller.ISummary;
}
