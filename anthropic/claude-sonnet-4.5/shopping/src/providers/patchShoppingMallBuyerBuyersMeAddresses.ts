import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import { IPageIShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBuyerAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function patchShoppingMallBuyerBuyersMeAddresses(props: {
  buyer: BuyerPayload;
  body: IShoppingMallBuyerAddress.IRequest;
}): Promise<IPageIShoppingMallBuyerAddress> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_buyer_addresses.findMany({
      where: {
        shopping_mall_buyer_id: props.buyer.id,
        ...(props.body.address_type !== undefined &&
          props.body.address_type !== null && {
            address_type: props.body.address_type,
          }),
        ...(props.body.address_label && {
          address_label: {
            contains: props.body.address_label,
            mode: "insensitive",
          },
        }),
        ...(props.body.is_default !== undefined && {
          is_default: props.body.is_default,
        }),
        ...(props.body.search && {
          OR: [
            {
              recipient_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              street_address_line1: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              street_address_line2: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            { city: { contains: props.body.search, mode: "insensitive" } },
            { state: { contains: props.body.search, mode: "insensitive" } },
            {
              postal_code: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }),
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    MyGlobal.prisma.shopping_mall_buyer_addresses.count({
      where: {
        shopping_mall_buyer_id: props.buyer.id,
        ...(props.body.address_type !== undefined &&
          props.body.address_type !== null && {
            address_type: props.body.address_type,
          }),
        ...(props.body.address_label && {
          address_label: {
            contains: props.body.address_label,
            mode: "insensitive",
          },
        }),
        ...(props.body.is_default !== undefined && {
          is_default: props.body.is_default,
        }),
        ...(props.body.search && {
          OR: [
            {
              recipient_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              street_address_line1: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              street_address_line2: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            { city: { contains: props.body.search, mode: "insensitive" } },
            { state: { contains: props.body.search, mode: "insensitive" } },
            {
              postal_code: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }),
      },
    }),
  ]);

  return {
    data: data.map((address) => ({
      id: address.id as string & tags.Format<"uuid">,
      shopping_mall_buyer_id: address.shopping_mall_buyer_id as string &
        tags.Format<"uuid">,
      recipient_name: address.recipient_name,
      phone: address.phone,
      street_address_line1: address.street_address_line1,
      street_address_line2: address.street_address_line2 ?? undefined,
      city: address.city,
      state: address.state ?? undefined,
      postal_code: address.postal_code,
      country: address.country,
      address_label: address.address_label,
      address_type: address.address_type,
      special_delivery_instructions:
        address.special_delivery_instructions ?? undefined,
      is_default: address.is_default,
      created_at: toISOStringSafe(address.created_at),
      updated_at: toISOStringSafe(address.updated_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
