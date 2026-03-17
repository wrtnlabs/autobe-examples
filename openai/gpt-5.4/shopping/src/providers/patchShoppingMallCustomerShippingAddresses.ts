import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingAddress";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShippingAddressAtSummaryTransformer } from "../transformers/ShoppingMallShippingAddressAtSummaryTransformer";
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
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.recipient_name !== undefined && {
      recipient_name: {
        contains: props.body.recipient_name,
      },
    }),
    ...(props.body.phone_number !== undefined && {
      phone_number: {
        contains: props.body.phone_number,
      },
    }),
    ...(props.body.street_address !== undefined && {
      street_address: {
        contains: props.body.street_address,
      },
    }),
    ...(props.body.city !== undefined && {
      city: {
        contains: props.body.city,
      },
    }),
    ...(props.body.state_province !== undefined && {
      state_province: {
        contains: props.body.state_province,
      },
    }),
    ...(props.body.postal_code !== undefined && {
      postal_code: {
        contains: props.body.postal_code,
      },
    }),
    ...(props.body.country !== undefined && {
      country: {
        contains: props.body.country,
      },
    }),
    ...(props.body.is_default !== undefined && {
      is_default: props.body.is_default,
    }),
    ...(props.body.search !== undefined &&
      props.body.search.length !== 0 && {
        OR: [
          {
            recipient_name: {
              contains: props.body.search,
            },
          },
          {
            phone_number: {
              contains: props.body.search,
            },
          },
          {
            street_address: {
              contains: props.body.search,
            },
          },
          {
            city: {
              contains: props.body.search,
            },
          },
          {
            state_province: {
              contains: props.body.search,
            },
          },
          {
            postal_code: {
              contains: props.body.search,
            },
          },
          {
            country: {
              contains: props.body.search,
            },
          },
        ],
      }),
  } satisfies Prisma.shopping_mall_shipping_addressesWhereInput;
  const orderBy:
    | Prisma.shopping_mall_shipping_addressesOrderByWithRelationInput[]
    | null =
    props.body.sort === undefined || props.body.sort === "created_at_desc"
      ? ([
          { is_default: "desc" },
          { created_at: "desc" },
          { id: "asc" },
        ] satisfies Prisma.shopping_mall_shipping_addressesOrderByWithRelationInput[])
      : props.body.sort === "created_at_asc"
        ? ([
            { is_default: "desc" },
            { created_at: "asc" },
            { id: "asc" },
          ] satisfies Prisma.shopping_mall_shipping_addressesOrderByWithRelationInput[])
        : props.body.sort === "updated_at_desc"
          ? ([
              { is_default: "desc" },
              { updated_at: "desc" },
              { id: "asc" },
            ] satisfies Prisma.shopping_mall_shipping_addressesOrderByWithRelationInput[])
          : props.body.sort === "updated_at_asc"
            ? ([
                { is_default: "desc" },
                { updated_at: "asc" },
                { id: "asc" },
              ] satisfies Prisma.shopping_mall_shipping_addressesOrderByWithRelationInput[])
            : props.body.sort === "recipient_name_asc"
              ? ([
                  { is_default: "desc" },
                  { recipient_name: "asc" },
                  { id: "asc" },
                ] satisfies Prisma.shopping_mall_shipping_addressesOrderByWithRelationInput[])
              : props.body.sort === "recipient_name_desc"
                ? ([
                    { is_default: "desc" },
                    { recipient_name: "desc" },
                    { id: "asc" },
                  ] satisfies Prisma.shopping_mall_shipping_addressesOrderByWithRelationInput[])
                : props.body.sort === "city_asc"
                  ? ([
                      { is_default: "desc" },
                      { city: "asc" },
                      { id: "asc" },
                    ] satisfies Prisma.shopping_mall_shipping_addressesOrderByWithRelationInput[])
                  : props.body.sort === "city_desc"
                    ? ([
                        { is_default: "desc" },
                        { city: "desc" },
                        { id: "asc" },
                      ] satisfies Prisma.shopping_mall_shipping_addressesOrderByWithRelationInput[])
                    : props.body.sort === "country_asc"
                      ? ([
                          { is_default: "desc" },
                          { country: "asc" },
                          { id: "asc" },
                        ] satisfies Prisma.shopping_mall_shipping_addressesOrderByWithRelationInput[])
                      : props.body.sort === "country_desc"
                        ? ([
                            { is_default: "desc" },
                            { country: "desc" },
                            { id: "asc" },
                          ] satisfies Prisma.shopping_mall_shipping_addressesOrderByWithRelationInput[])
                        : null;
  if (orderBy === null) {
    throw new HttpException("Unsupported sort field", 400);
  }
  const data = await MyGlobal.prisma.shopping_mall_shipping_addresses.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...ShoppingMallShippingAddressAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_shipping_addresses.count({
    where,
  });
  if (page > 1 && total > 0 && skip >= total) {
    throw new HttpException("Page out of range", 400);
  }
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallShippingAddressAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
