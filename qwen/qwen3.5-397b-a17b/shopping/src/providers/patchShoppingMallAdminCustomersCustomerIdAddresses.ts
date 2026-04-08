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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerAddressAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCustomersCustomerIdAddresses(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerAddress.IRequest;
}): Promise<IPageIShoppingMallCustomerAddress.ISummary> {
  const customerProfile =
    await MyGlobal.prisma.shopping_mall_customer_profiles.findFirst({
      where: {
        shopping_mall_member_id: props.customerId,
        deleted_at: null,
      },
    });
  if (!customerProfile) {
    throw new HttpException("Customer not found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_customer_profile_id: customerProfile.id,
    deleted_at: null,
    ...(props.body.is_default !== undefined && {
      is_default: props.body.is_default,
    }),
    ...(props.body.recipient_name !== undefined && {
      recipient_name: {
        contains: props.body.recipient_name,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.city !== undefined && {
      city: { contains: props.body.city, mode: "insensitive" as const },
    }),
    ...(props.body.country !== undefined && { country: props.body.country }),
    ...(props.body.postal_code !== undefined && {
      postal_code: props.body.postal_code,
    }),
    ...(props.body.search !== undefined && {
      OR: [
        {
          recipient_name: {
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
        { city: { contains: props.body.search, mode: "insensitive" as const } },
      ],
    }),
  } satisfies Prisma.shopping_mall_customer_addressesWhereInput;
  const sort = props.body.sort ?? "created_at:desc";
  const [field, direction] = sort.split(":");
  const orderByInput = {
    ...(field === "recipient_name" && {
      recipient_name: direction === "asc" ? "asc" : "desc",
    }),
    ...(field === "city" && { city: direction === "asc" ? "asc" : "desc" }),
    ...(field === "created_at" && {
      created_at: direction === "asc" ? "asc" : "desc",
    }),
  } satisfies Prisma.shopping_mall_customer_addressesOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findMany({
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
      records,
      ShoppingMallCustomerAddressAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallCustomerAddress.ISummary;
}
