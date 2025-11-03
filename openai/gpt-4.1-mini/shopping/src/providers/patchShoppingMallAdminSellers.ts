import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSellers(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const { body } = props;

  const where = {
    deleted_at: null,
    ...(body.email !== undefined && { email: { contains: body.email } }),
    ...(body.store_name !== undefined && {
      store_name: { contains: body.store_name },
    }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from as string,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to as string,
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_sellersWhereInput as Prisma.shopping_mall_sellersWhereInput;

  const page = Number(body.page);
  const limit = Number(body.limit);
  const skip = (page - 1) * limit;

  const orderBy =
    body.sort_by === "store_name"
      ? {
          store_name: (body.sort_order === "asc"
            ? "asc"
            : "desc") as Prisma.SortOrder,
        }
      : {
          created_at: (body.sort_order === "asc"
            ? "asc"
            : "desc") as Prisma.SortOrder,
        };

  const [sellers, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        store_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shopping_mall_seller_profiles: {
          select: {
            business_registration_number: true,
            contact_email: true,
            contact_phone: true,
            profile_description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({ where }),
  ]);

  const data = sellers.map((seller) => {
    const profile = seller.shopping_mall_seller_profiles;
    return {
      id: seller.id,
      email: seller.email,
      store_name: seller.store_name,
      created_at: toISOStringSafe(seller.created_at),
      updated_at: toISOStringSafe(seller.updated_at),
      deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
      is_active: seller.deleted_at === null,
      profile: profile
        ? {
            business_registration_number:
              profile.business_registration_number ?? undefined,
            contact_email: profile.contact_email,
            contact_phone: profile.contact_phone ?? undefined,
            profile_description: profile.profile_description ?? undefined,
            created_at: profile.created_at
              ? toISOStringSafe(profile.created_at)
              : undefined,
            updated_at: profile.updated_at
              ? toISOStringSafe(profile.updated_at)
              : undefined,
            deleted_at: profile.deleted_at
              ? toISOStringSafe(profile.deleted_at)
              : null,
          }
        : undefined,
    };
  });

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  } satisfies IPageIShoppingMallSeller.ISummary as IPageIShoppingMallSeller.ISummary;
}
