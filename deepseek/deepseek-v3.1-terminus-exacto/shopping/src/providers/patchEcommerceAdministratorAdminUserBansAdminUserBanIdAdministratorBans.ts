import { IEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfAdministrator";
import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminUserBanOfAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceAdminUserBanOfAdministratorAtSummaryTransformer } from "../transformers/EcommerceAdminUserBanOfAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorAdminUserBansAdminUserBanIdAdministratorBans(props: {
  administrator: AdministratorPayload;
  adminUserBanId: string & tags.Format<"uuid">;
  body: IEcommerceAdminUserBanOfAdministrator.IRequest;
}): Promise<IPageIEcommerceAdminUserBanOfAdministrator.ISummary> {
  // Validate parent ban record exists
  await MyGlobal.prisma.ecommerce_admin_user_bans.findUniqueOrThrow({
    where: { id: props.adminUserBanId, deleted_at: null },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions based on actual schema fields
  const whereInput = {
    admin_user_ban_id: props.adminUserBanId,
  } satisfies Prisma.ecommerce_admin_user_ban_of_administratorsWhereInput;
  // Query data with pagination
  const data =
    await MyGlobal.prisma.ecommerce_admin_user_ban_of_administrators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceAdminUserBanOfAdministratorAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.ecommerce_admin_user_ban_of_administrators.count({
      where: whereInput,
    });
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceAdminUserBanOfAdministratorAtSummaryTransformer.transform,
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
