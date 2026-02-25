import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminAdmins(props: {
  admin: AdminPayload;
  body: IEcommerceAdmin.IRequest;
}): Promise<IPageIEcommerceAdmin.ISummary> {
  // Extract parameters with defaults for pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  // Build dynamic where conditions from filters
  const whereCondition: Prisma.ecommerce_adminsWhereInput = {};
  if (props.body.email) {
    whereCondition.email = {
      contains: props.body.email,
      mode: "insensitive",
    };
  }
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_admins.count({
    where: whereCondition,
  });
  // Retrieve paginated results with proper select for summary data
  const data = await MyGlobal.prisma.ecommerce_admins.findMany({
    where: whereCondition,
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      email: true,
    },
  });
  // Convert to proper DTO format
  const formattedData = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    email: item.email as string & tags.Format<"email">,
  }));
  // Calculate total pages
  const pages = Math.ceil(total / limit);
  return {
    data: formattedData as IEcommerceAdmin.ISummary[],
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } as IPage.IPagination,
  } as IPageIEcommerceAdmin.ISummary;
}
