import { IEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfCustomer";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminUserBanOfCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceAdminUserBanOfCustomerAtSummaryTransformer } from "../transformers/EcommerceAdminUserBanOfCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorAdminUserBansAdminUserBanIdCustomerBans(props: {
  administrator: AdministratorPayload;
  adminUserBanId: string & tags.Format<"uuid">;
  body: IEcommerceAdminUserBanOfCustomer.IRequest;
}): Promise<IPageIEcommerceAdminUserBanOfCustomer.ISummary> {
  // Verify admin user ban exists
  await MyGlobal.prisma.ecommerce_admin_user_bans.findUniqueOrThrow({
    where: { id: props.adminUserBanId },
  });
  // Build where clause with proper date handling
  const whereInput = {
    ecommerce_admin_user_ban_id: props.adminUserBanId,
    deleted_at: null,
    ...(props.body.customer_id && {
      customer: {
        is: { id: props.body.customer_id },
      },
    }),
    ...(props.body.created_after && {
      created_at: {
        gte: props.body.created_after,
      },
    }),
    ...(props.body.created_before && {
      created_at: {
        lte: props.body.created_before,
      },
    }),
  } satisfies Prisma.ecommerce_admin_user_ban_of_customersWhereInput;
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query data
  const data =
    await MyGlobal.prisma.ecommerce_admin_user_ban_of_customers.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceAdminUserBanOfCustomerAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_admin_user_ban_of_customers.count({
      where: whereInput,
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceAdminUserBanOfCustomerAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
