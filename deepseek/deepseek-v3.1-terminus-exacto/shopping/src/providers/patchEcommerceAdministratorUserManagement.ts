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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceAdministratorAtSummaryTransformer } from "../transformers/EcommerceAdministratorAtSummaryTransformer";
import { EcommerceCustomerAtSummaryTransformer } from "../transformers/EcommerceCustomerAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "../transformers/EcommerceSellerAtSummaryTransformer";
import { EcommerceSuperAdministratorAtSummaryTransformer } from "../transformers/EcommerceSuperAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorUserManagement(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMetadataRegistryRelationship.IRequest;
}): Promise<IPageIEcommerceMetadataRegistryRelationship.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions for each user type
  const buildsConditions = {
    customers: {
      deleted_at: null,
      ...(props.body.search && {
        OR: [
          { email: { contains: props.body.search } },
          { display_name: { contains: props.body.search } },
        ],
      }),
      ...(props.body.accountStatus === "active" && { deleted_at: null }),
      ...(props.body.accountStatus === "banned" && {
        deleted_at: { not: null },
      }),
      ...(props.body.createdAt_from && {
        created_at: { gte: new Date(props.body.createdAt_from) },
      }),
      ...(props.body.createdAt_to && {
        created_at: { lte: new Date(props.body.createdAt_to) },
      }),
    } satisfies Prisma.ecommerce_customersWhereInput,
    sellers: {
      deleted_at: null,
      ...(props.body.search && {
        OR: [
          { email: { contains: props.body.search } },
          { shop_name: { contains: props.body.search } },
        ],
      }),
      ...(props.body.accountStatus === "active" && { deleted_at: null }),
      ...(props.body.accountStatus === "pending" && {
        account_status: "pending_approval",
      }),
      ...(props.body.accountStatus === "suspended" && {
        account_status: "suspended",
      }),
      ...(props.body.accountStatus === "banned" && {
        deleted_at: { not: null },
      }),
      ...(props.body.createdAt_from && {
        created_at: { gte: new Date(props.body.createdAt_from) },
      }),
      ...(props.body.createdAt_to && {
        created_at: { lte: new Date(props.body.createdAt_to) },
      }),
    } satisfies Prisma.ecommerce_sellersWhereInput,
    administrators: {
      deleted_at: null,
      ...(props.body.search && { email: { contains: props.body.search } }),
      ...(props.body.accountStatus === "active" && { deleted_at: null }),
      ...(props.body.accountStatus === "banned" && {
        deleted_at: { not: null },
      }),
      ...(props.body.createdAt_from && {
        created_at: { gte: new Date(props.body.createdAt_from) },
      }),
      ...(props.body.createdAt_to && {
        created_at: { lte: new Date(props.body.createdAt_to) },
      }),
    } satisfies Prisma.ecommerce_administratorsWhereInput,
    superAdministrators: {
      deleted_at: null,
      ...(props.body.search && { email: { contains: props.body.search } }),
      ...(props.body.accountStatus === "active" && { deleted_at: null }),
      ...(props.body.accountStatus === "banned" && {
        deleted_at: { not: null },
      }),
      ...(props.body.createdAt_from && {
        created_at: { gte: new Date(props.body.createdAt_from) },
      }),
      ...(props.body.createdAt_to && {
        created_at: { lte: new Date(props.body.createdAt_to) },
      }),
    } satisfies Prisma.ecommerce_super_administratorsWhereInput,
  };
  // Execute queries for each user type that matches the filter
  const queries = [];
  if (!props.body.userType || props.body.userType === "customer") {
    const customerData = await MyGlobal.prisma.ecommerce_customers.findMany({
      where: buildsConditions.customers,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceCustomerAtSummaryTransformer.select(),
    });
    queries.push(
      customerData.map(async (customer) => ({
        type: "customer" as const,
        data: await EcommerceCustomerAtSummaryTransformer.transform(customer),
      })),
    );
  }
  if (!props.body.userType || props.body.userType === "seller") {
    const sellerData = await MyGlobal.prisma.ecommerce_sellers.findMany({
      where: buildsConditions.sellers,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceSellerAtSummaryTransformer.select(),
    });
    queries.push(
      sellerData.map(async (seller) => ({
        type: "seller" as const,
        data: await EcommerceSellerAtSummaryTransformer.transform(seller),
      })),
    );
  }
  if (!props.body.userType || props.body.userType === "administrator") {
    const adminData = await MyGlobal.prisma.ecommerce_administrators.findMany({
      where: buildsConditions.administrators,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceAdministratorAtSummaryTransformer.select(),
    });
    queries.push(
      adminData.map(async (admin) => ({
        type: "administrator" as const,
        data: await EcommerceAdministratorAtSummaryTransformer.transform(admin),
      })),
    );
  }
  if (!props.body.userType || props.body.userType === "superAdministrator") {
    const superAdminData =
      await MyGlobal.prisma.ecommerce_super_administrators.findMany({
        where: buildsConditions.superAdministrators,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...EcommerceSuperAdministratorAtSummaryTransformer.select(),
      });
    queries.push(
      superAdminData.map(async (superAdmin) => ({
        type: "superAdministrator" as const,
        data: await EcommerceSuperAdministratorAtSummaryTransformer.transform(
          superAdmin,
        ),
      })),
    );
  }
  // Count total records for pagination
  const countQueries = [];
  if (!props.body.userType || props.body.userType === "customer") {
    const customerCount = MyGlobal.prisma.ecommerce_customers.count({
      where: buildsConditions.customers,
    });
    countQueries.push(customerCount);
  }
  if (!props.body.userType || props.body.userType === "seller") {
    const sellerCount = MyGlobal.prisma.ecommerce_sellers.count({
      where: buildsConditions.sellers,
    });
    countQueries.push(sellerCount);
  }
  if (!props.body.userType || props.body.userType === "administrator") {
    const adminCount = MyGlobal.prisma.ecommerce_administrators.count({
      where: buildsConditions.administrators,
    });
    countQueries.push(adminCount);
  }
  if (!props.body.userType || props.body.userType === "superAdministrator") {
    const superAdminCount =
      MyGlobal.prisma.ecommerce_super_administrators.count({
        where: buildsConditions.superAdministrators,
      });
    countQueries.push(superAdminCount);
  }
  const [results, counts] = await Promise.all([
    Promise.all(queries.flat()),
    Promise.all(countQueries),
  ]);
  const totalCount = counts.reduce((sum, count) => sum + count, 0);
  const resultsData = await Promise.all(results);
  // Sort by creation date (newest first) and slice for pagination
  const sortedResults = resultsData
    .sort(
      (a, b) =>
        new Date(b.data.created_at).getTime() -
        new Date(a.data.created_at).getTime(),
    )
    .slice(0, limit);
  // Transform to administrative actions format for the response
  const administrativeActions = sortedResults.map((result) => ({
    id: result.data.id,
    action_type: `${result.type.toUpperCase()}_MANAGEMENT`,
    general_description: `User ${result.type} account management`,
    created_at: result.data.created_at,
    administrator: null,
    superAdministrator: null,
  })) satisfies IEcommerceMetadataRegistryRelationship.ISummary[];
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
    data: administrativeActions,
  } satisfies IPageIEcommerceMetadataRegistryRelationship.ISummary;
}
