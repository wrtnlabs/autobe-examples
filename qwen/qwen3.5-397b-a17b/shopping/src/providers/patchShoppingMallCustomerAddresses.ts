import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
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

export async function patchShoppingMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallAddress.IRequest;
}): Promise<IPageIShoppingMallAddress.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_addressesWhereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.search && {
      recipient_name: {
        contains: props.body.search,
      },
    }),
    ...(props.body.city && { city: props.body.city }),
    ...(props.body.country && { country: props.body.country }),
    ...(props.body.is_default !== undefined && {
      is_default: props.body.is_default,
    }),
  } satisfies Prisma.shopping_mall_addressesWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_addresses.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      recipient_name: true,
      recipient_phone: true,
      street_address: true,
      city: true,
      state: true,
      postal_code: true,
      country: true,
      is_default: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_addresses.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: data.map(
      (address) =>
        ({
          id: address.id as string & tags.Format<"uuid">,
          recipientName: address.recipient_name,
          recipientPhone: address.recipient_phone,
          streetAddress: address.street_address,
          city: address.city,
          state: address.state,
          postalCode: address.postal_code,
          country: address.country,
          isDefault: address.is_default,
          createdAt: toISOStringSafe(address.created_at),
          updatedAt: toISOStringSafe(address.updated_at),
          deletedAt: address.deleted_at
            ? toISOStringSafe(address.deleted_at)
            : null,
        }) satisfies IShoppingMallAddress.ISummary,
    ),
  };
}
