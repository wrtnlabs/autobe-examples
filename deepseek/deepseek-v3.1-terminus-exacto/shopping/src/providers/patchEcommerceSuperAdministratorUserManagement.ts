import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorUserManagement(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMetadataRegistryRelationship.IRequest;
}): Promise<IPageIEcommerceMetadataRegistryRelationship.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Parse date range filters if provided
  const createdAtFrom = props.body.createdAt_from
    ? new Date(props.body.createdAt_from)
    : undefined;
  const createdAtTo = props.body.createdAt_to
    ? new Date(props.body.createdAt_to)
    : undefined;
  // Determine which tables to query based on userType filter
  const userTypes = props.body.userType
    ? [props.body.userType]
    : ["customer", "seller", "administrator", "superAdministrator"];
  type UserResult = {
    id: string;
    type: string;
    email: string;
    display_name?: string;
    shop_name?: string;
    account_status: string;
    created_at: Date;
  };
  const allResults: UserResult[] = [];
  let totalCount = 0;
  // Query each user type table separately and accumulate results
  for (const userType of userTypes) {
    // Build user-specific where conditions
    let whereCondition: any = {
      deleted_at: null,
    };
    // Apply created_at date range filter
    if (createdAtFrom || createdAtTo) {
      whereCondition.created_at = {};
      if (createdAtFrom) whereCondition.created_at.gte = createdAtFrom;
      if (createdAtTo) whereCondition.created_at.lte = createdAtTo;
    }
    // Apply search filter
    if (props.body.search) {
      whereCondition.OR = [
        { email: { contains: props.body.search, mode: "insensitive" } },
      ];
      // Add user-specific search fields
      if (userType === "customer") {
        whereCondition.OR.push({
          display_name: { contains: props.body.search, mode: "insensitive" },
        });
      } else if (userType === "seller") {
        whereCondition.OR.push({
          shop_name: { contains: props.body.search, mode: "insensitive" },
        });
      }
    }
    // Apply account status filter with user-specific mappings
    if (props.body.accountStatus) {
      switch (userType) {
        case "customer":
          whereCondition.deleted_at =
            props.body.accountStatus === "banned" ? { not: null } : null;
          break;
        case "seller":
          if (props.body.accountStatus === "pending") {
            whereCondition.account_status = "pending_approval";
          } else if (props.body.accountStatus === "active") {
            whereCondition.account_status = "active";
          } else if (props.body.accountStatus === "suspended") {
            whereCondition.account_status = "suspended";
          } else if (props.body.accountStatus === "banned") {
            whereCondition.deleted_at = { not: null };
          }
          break;
        case "administrator":
        case "superAdministrator":
          whereCondition.deleted_at =
            props.body.accountStatus === "banned" ? { not: null } : null;
          break;
      }
    }
    // Get total count for this user type
    const tableCount = await getCountForTable(userType, whereCondition);
    totalCount += tableCount;
    // Get paginated data for this user type
    const tableData = await getDataForTable(
      userType,
      whereCondition,
      skip,
      limit,
    );
    allResults.push(...tableData);
  }
  // Combine and sort all results by created_at descending
  const sortedResults = allResults.sort(
    (a, b) => b.created_at.getTime() - a.created_at.getTime(),
  );
  // Transform results to administrative actions format
  const transformedActions = await ArrayUtil.asyncMap(
    sortedResults.slice(0, limit),
    async (user) => {
      return {
        id: user.id,
        action_type: `${user.type.toUpperCase()}_VIEW`,
        general_description: `${user.type} account viewed`,
        created_at: user.created_at.toISOString(),
        administrator: null,
        superAdministrator: null,
      } satisfies IEcommerceMetadataRegistryRelationship.ISummary;
    },
  );
  return {
    data: transformedActions,
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
  };
}
async function getCountForTable(
  userType: string,
  whereCondition: any,
): Promise<number> {
  switch (userType) {
    case "customer":
      return await MyGlobal.prisma.ecommerce_customers.count({
        where: whereCondition,
      });
    case "seller":
      return await MyGlobal.prisma.ecommerce_sellers.count({
        where: whereCondition,
      });
    case "administrator":
      return await MyGlobal.prisma.ecommerce_administrators.count({
        where: whereCondition,
      });
    case "superAdministrator":
      return await MyGlobal.prisma.ecommerce_super_administrators.count({
        where: whereCondition,
      });
    default:
      return 0;
  }
}
async function getDataForTable(
  userType: string,
  whereCondition: any,
  skip: number,
  limit: number,
): Promise<any[]> {
  const commonSelect = {
    id: true,
    email: true,
    created_at: true,
  };
  switch (userType) {
    case "customer":
      const customers = await MyGlobal.prisma.ecommerce_customers.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          ...commonSelect,
          display_name: true,
          deleted_at: true,
        },
      });
      return customers.map((c) => ({
        ...c,
        type: "customer",
        account_status: c.deleted_at ? "banned" : "active",
      }));
    case "seller":
      const sellers = await MyGlobal.prisma.ecommerce_sellers.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          ...commonSelect,
          shop_name: true,
          account_status: true,
          deleted_at: true,
        },
      });
      return sellers.map((s) => ({
        ...s,
        type: "seller",
        account_status: s.deleted_at ? "banned" : s.account_status,
      }));
    case "administrator":
      const admins = await MyGlobal.prisma.ecommerce_administrators.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          ...commonSelect,
          deleted_at: true,
        },
      });
      return admins.map((a) => ({
        ...a,
        type: "administrator",
        account_status: a.deleted_at ? "banned" : "active",
      }));
    case "superAdministrator":
      const superAdmins =
        await MyGlobal.prisma.ecommerce_super_administrators.findMany({
          where: whereCondition,
          skip,
          take: limit,
          orderBy: { created_at: "desc" },
          select: {
            ...commonSelect,
            deleted_at: true,
          },
        });
      return superAdmins.map((sa) => ({
        ...sa,
        type: "superAdministrator",
        account_status: sa.deleted_at ? "banned" : "active",
      }));
    default:
      return [];
  }
}
