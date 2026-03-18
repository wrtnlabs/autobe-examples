import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingAddress";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
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

export async function patchShoppingMallCustomerShippingAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallShippingAddress.IRequest;
}): Promise<IPageIShoppingMallShippingAddress.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    shopping_mall_customer_profile_id: props.customer.id,
    deleted_at: null,
    ...(props.body.recipientName !== undefined && {
      recipient_name: {
        contains: props.body.recipientName,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.phoneNumber !== undefined && {
      phone_number: {
        contains: props.body.phoneNumber,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.streetAddress !== undefined && {
      street_address: {
        contains: props.body.streetAddress,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.city !== undefined && {
      city: { contains: props.body.city, mode: "insensitive" as const },
    }),
    ...(props.body.stateProvince !== undefined && {
      state_province: {
        contains: props.body.stateProvince,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.postalCode !== undefined && {
      postal_code: {
        contains: props.body.postalCode,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.country !== undefined && {
      country: { contains: props.body.country, mode: "insensitive" as const },
    }),
    ...(props.body.isDefault !== undefined && {
      is_default: props.body.isDefault,
    }),
    ...(props.body.search !== undefined &&
      props.body.search.trim().length > 0 && {
        OR: [
          {
            recipient_name: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            phone_number: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            street_address: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            city: { contains: props.body.search, mode: "insensitive" as const },
          },
          {
            state_province: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            postal_code: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            country: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
  } satisfies Prisma.shopping_mall_shipping_addressesWhereInput;
  const orderBy = (
    props.body.sort === "recipient_name_asc"
      ? { recipient_name: "asc" as const }
      : props.body.sort === "recipient_name_desc"
        ? { recipient_name: "desc" as const }
        : props.body.sort === "created_at_asc"
          ? { created_at: "asc" as const }
          : props.body.sort === "updated_at_asc"
            ? { updated_at: "asc" as const }
            : props.body.sort === "updated_at_desc"
              ? { updated_at: "desc" as const }
              : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_shipping_addressesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_shipping_addresses.findMany({
    where,
    skip,
    take: limit,
    orderBy,
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
  const records = await MyGlobal.prisma.shopping_mall_shipping_addresses.count({
    where,
  });
  return {
    data: data.map((row) => ({
      id: row.id,
      customerProfile: {},
      recipientName: row.recipient_name,
      phoneNumber: row.phone_number,
      streetAddress: row.street_address,
      city: row.city,
      stateProvince: row.state_province,
      postalCode: row.postal_code,
      country: row.country,
      isDefault: row.is_default,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      deletedAt: row.deleted_at === null ? null : row.deleted_at.toISOString(),
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
