import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceSellerAtSummaryTransformer } from "../transformers/EcommerceSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorAdminUserBansAdminUserBanIdBannedSellers(props: {
  administrator: AdministratorPayload;
  adminUserBanId: string & tags.Format<"uuid">;
  body: IEcommerceSeller.IRequest;
}): Promise<IPageIEcommerceSeller.ISummary> {
  // Verify the banning action exists
  const banAction = await MyGlobal.prisma.ecommerce_admin_user_bans.findUnique({
    where: {
      id: props.adminUserBanId,
      deleted_at: null,
    },
  });
  if (!banAction) {
    throw new HttpException("Administrative banning action not found", 404);
  }
  // Parse pagination parameters with validation
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 50));
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date handling
  const dateFilters: Record<string, Date> = {};
  if (props.body.created_after) {
    dateFilters.gte = new Date(props.body.created_after);
  }
  if (props.body.created_before) {
    dateFilters.lte = new Date(props.body.created_before);
  }
  const whereInput = {
    userBan: {
      id: props.adminUserBanId,
      deleted_at: null,
    },
    seller: {
      deleted_at: null,
      ...(props.body.search && {
        shop_name: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      }),
      ...(props.body.account_status && {
        account_status: props.body.account_status,
      }),
      ...(Object.keys(dateFilters).length > 0 && { created_at: dateFilters }),
    },
  } satisfies Prisma.ecommerce_admin_user_ban_of_sellersWhereInput;
  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_admin_user_ban_of_sellers.findMany({
      where: whereInput,
      include: {
        seller: EcommerceSellerAtSummaryTransformer.select(),
      },
      orderBy: { created_at: "desc" as const },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ecommerce_admin_user_ban_of_sellers.count({
      where: whereInput,
    }),
  ]);
  // Transform seller data using regular Promise.all instead of ArrayUtil.asyncMap
  const transformedData = await Promise.all(
    data.map((item) =>
      EcommerceSellerAtSummaryTransformer.transform(item.seller),
    ),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 1,
    } satisfies IPage.IPagination,
  };
}
