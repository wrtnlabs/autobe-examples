import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAddress";
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

export async function patchEcommerceMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceMallAddress.IRequest;
}): Promise<IPageIEcommerceMallAddress.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_addressesWhereInput = {
    deleted_at: null,
    user_id: props.customer.id,
  };
  if (props.body.is_default !== undefined) {
    where.is_default = props.body.is_default;
  }
  if (props.body.search) {
    const searchTerms = props.body.search.trim().split(/\s+/);
    where.OR = searchTerms.map((term) => ({
      OR: [
        { recipient_name: { contains: term, mode: "insensitive" } },
        { street_address: { contains: term, mode: "insensitive" } },
        { city: { contains: term, mode: "insensitive" } },
      ],
    }));
  }
  const orderBy: Prisma.ecommerce_mall_addressesOrderByWithRelationInput = {
    is_default: "desc",
    created_at: "desc",
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_addresses.findMany({
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
      },
    }),
    MyGlobal.prisma.ecommerce_mall_addresses.count({ where }),
  ]);
  const result: IEcommerceMallAddress.ISummary[] = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    recipient_name: record.recipient_name,
    phone_number: record.phone_number,
    street_address: record.street_address,
    city: record.city,
    state_province: record.state_province,
    postal_code: record.postal_code,
    country: record.country,
    is_default: record.is_default,
    created_at: record.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: record.updated_at.toISOString() as string &
      tags.Format<"date-time">,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: result,
  } satisfies IPageIEcommerceMallAddress.ISummary;
}
