import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerShippingAddresses(props: {
  customer: CustomerPayload;
  body: IMallPlatformShippingAddress.IRequest;
}): Promise<IPageIMallPlatformShippingAddress.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_shipping_addressesWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.search === undefined || props.body.search === null
      ? {}
      : {
          OR: [
            {
              recipient_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              phone_number: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              street_address: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            { city: { contains: props.body.search, mode: "insensitive" } },
            {
              state_province: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              postal_code: { contains: props.body.search, mode: "insensitive" },
            },
            { country: { contains: props.body.search, mode: "insensitive" } },
          ],
        }),
  };
  const orderBy: Prisma.mall_platform_shipping_addressesOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : props.body.sort === "recipientNameAsc"
        ? { recipient_name: "asc" }
        : props.body.sort === "recipientNameDesc"
          ? { recipient_name: "desc" }
          : props.body.sort === "cityAsc"
            ? { city: "asc" }
            : props.body.sort === "cityDesc"
              ? { city: "desc" }
              : { created_at: "desc" };
  const data = await MyGlobal.prisma.mall_platform_shipping_addresses.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      recipient_name: true,
      phone_number: true,
      street_address: true,
      city: true,
      state_province: true,
      postal_code: true,
      country: true,
      is_default: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total: number =
    await MyGlobal.prisma.mall_platform_shipping_addresses.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(data, async (address) => ({
      id: address.id,
      recipientName: address.recipient_name,
      phoneNumber: address.phone_number,
      streetAddress: address.street_address,
      city: address.city,
      stateProvince: address.state_province,
      postalCode: address.postal_code,
      country: address.country,
      isDefault: address.is_default,
      createdAt: toISOStringSafe(address.created_at),
      updatedAt: toISOStringSafe(address.updated_at),
      deletedAt:
        address.deleted_at === null
          ? null
          : toISOStringSafe(address.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
