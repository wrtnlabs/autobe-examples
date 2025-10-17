import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAddresses(props: {
  admin: AdminPayload;
  body: IShoppingMallAddress.IRequest;
}): Promise<IPageIShoppingMallAddress> {
  const { admin, body } = props;

  const page = Math.max(0, body.page ?? 0);
  const pageSize = 20;
  const skip = page * pageSize;

  const whereCondition = {
    user_type: "admin",
    shopping_mall_admin_id: admin.id,
    deleted_at: null,
  };

  const [addresses, totalCount] = await Promise.all([
    MyGlobal.prisma.shopping_mall_addresses.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: pageSize,
    }),
    MyGlobal.prisma.shopping_mall_addresses.count({
      where: whereCondition,
    }),
  ]);

  const data: IShoppingMallAddress[] = addresses.map((address) => ({
    id: address.id as string & tags.Format<"uuid">,
    recipient_name: address.recipient_name,
    phone_number: address.phone_number,
    address_line1: address.address_line1,
  }));

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

  const pagination: IPage.IPagination = {
    current: Number(page),
    limit: Number(pageSize),
    records: totalCount,
    pages: totalPages,
  };

  return {
    pagination,
    data,
  };
}
