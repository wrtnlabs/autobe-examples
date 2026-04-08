import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCustomerAddressAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberAddresses(props: {
  member: MemberPayload;
  body: IShoppingMallCustomerAddress.IRequest;
}): Promise<IPageIShoppingMallCustomerAddress.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const customerProfile =
    await MyGlobal.prisma.shopping_mall_customer_profiles.findFirstOrThrow({
      where: {
        shopping_mall_member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  const whereInput: Prisma.shopping_mall_customer_addressesWhereInput = {
    shopping_mall_customer_profile_id: customerProfile.id,
    deleted_at: null,
    ...(props.body.is_default !== undefined && {
      is_default: props.body.is_default,
    }),
    ...(props.body.recipient_name !== undefined && {
      recipient_name: {
        contains: props.body.recipient_name,
        mode: "insensitive",
      },
    }),
    ...(props.body.city !== undefined && {
      city: { contains: props.body.city, mode: "insensitive" },
    }),
    ...(props.body.country !== undefined && { country: props.body.country }),
    ...(props.body.postal_code !== undefined && {
      postal_code: props.body.postal_code,
    }),
    ...(props.body.search !== undefined && {
      OR: [
        {
          recipient_name: { contains: props.body.search, mode: "insensitive" },
        },
        {
          street_address: { contains: props.body.search, mode: "insensitive" },
        },
        { city: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  };
  const sortParts = (props.body.sort ?? "created_at:desc").split(":");
  const sortField = sortParts[0];
  const sortDirection = sortParts[1] ?? "desc";
  const orderByInput: Prisma.shopping_mall_customer_addressesOrderByWithRelationInput =
    sortDirection === "asc" ? { [sortField]: "asc" } : { [sortField]: "desc" };
  const data = await MyGlobal.prisma.shopping_mall_customer_addresses.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallCustomerAddressAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_customer_addresses.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCustomerAddressAtSummaryTransformer.transform,
    ),
  };
}
