import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSellerProfiles(props: {
  admin: AdminPayload;
  body: IShoppingMallSellerProfile.IRequest;
}): Promise<IPageIShoppingMallSellerProfile.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const allowedSortFields = [
    "store_name",
    "contact_email",
    "created_at",
    "updated_at",
  ];
  const sortBy = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const where = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        OR: [
          { store_name: { contains: body.search } },
          { contact_email: { contains: body.search } },
          { profile_description: { contains: body.search } },
        ],
      }),
  };

  const [profiles, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_profiles.findMany({
      where,
      orderBy: { [sortBy!]: sortOrder! },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_seller_profiles.count({ where }),
  ]);

  const data = profiles.map((profile) => ({
    id: profile.id,
    shopping_mall_seller_id: profile.shopping_mall_seller_id,
    store_name: profile.store_name,
    business_registration_number: profile.business_registration_number ?? null,
    contact_email: profile.contact_email,
    contact_phone: profile.contact_phone ?? null,
    profile_description: profile.profile_description ?? null,
    created_at: toISOStringSafe(profile.created_at),
    updated_at: toISOStringSafe(profile.updated_at),
    deleted_at: profile.deleted_at ? toISOStringSafe(profile.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
