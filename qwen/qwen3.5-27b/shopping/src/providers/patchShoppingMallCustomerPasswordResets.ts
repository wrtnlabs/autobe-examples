import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
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

export async function patchShoppingMallCustomerPasswordResets(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerPasswordReset.IRequest;
}): Promise<IPageIShoppingMallCustomerPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 100;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const now = new Date();
  const computeStatus = (deletedAt: Date | null, expiredAt: Date): string => {
    if (deletedAt !== null) {
      return "used";
    }
    return expiredAt <= now ? "expired" : "active";
  };
  const buildCustomerWhere =
    (): Prisma.shopping_mall_customer_password_resetsWhereInput => {
      const conditions: any[] = [];
      if (props.body.status === "active") {
        conditions.push({ deleted_at: null, expired_at: { gt: now } });
      } else if (props.body.status === "expired") {
        conditions.push({ deleted_at: null, expired_at: { lte: now } });
      } else if (props.body.status === "used") {
        conditions.push({ deleted_at: { not: null } });
      }
      if (props.body.email) {
        conditions.push({
          customer: {
            email: { contains: props.body.email, mode: "insensitive" },
          },
        });
      }
      if (props.body.date_range) {
        const dateConditions: any[] = [];
        if (props.body.date_range.start) {
          dateConditions.push({
            created_at: { gte: new Date(props.body.date_range.start) },
          });
        }
        if (props.body.date_range.end) {
          dateConditions.push({
            created_at: { lte: new Date(props.body.date_range.end) },
          });
        }
        if (dateConditions.length > 0) {
          conditions.push({ AND: dateConditions });
        }
      }
      return conditions.length > 0 ? { AND: conditions } : {};
    };
  const buildSellerWhere =
    (): Prisma.shopping_mall_seller_password_resetsWhereInput => {
      const conditions: any[] = [];
      if (props.body.status === "active") {
        conditions.push({ expires_at: { gt: now } });
      } else if (props.body.status === "expired") {
        conditions.push({ expires_at: { lte: now } });
      }
      if (props.body.email) {
        conditions.push({
          seller: {
            email: { contains: props.body.email, mode: "insensitive" },
          },
        });
      }
      if (props.body.date_range) {
        const dateConditions: any[] = [];
        if (props.body.date_range.start) {
          dateConditions.push({
            created_at: { gte: new Date(props.body.date_range.start) },
          });
        }
        if (props.body.date_range.end) {
          dateConditions.push({
            created_at: { lte: new Date(props.body.date_range.end) },
          });
        }
        if (dateConditions.length > 0) {
          conditions.push({ AND: dateConditions });
        }
      }
      return conditions.length > 0 ? { AND: conditions } : {};
    };
  const buildAdminWhere =
    (): Prisma.shopping_mall_administrator_password_resetsWhereInput => {
      const conditions: any[] = [];
      if (props.body.status === "active") {
        conditions.push({ deleted_at: null, expired_at: { gt: now } });
      } else if (props.body.status === "expired") {
        conditions.push({ deleted_at: null, expired_at: { lte: now } });
      } else if (props.body.status === "used") {
        conditions.push({ deleted_at: { not: null } });
      }
      if (props.body.email) {
        conditions.push({
          administrator: {
            email: { contains: props.body.email, mode: "insensitive" },
          },
        });
      }
      if (props.body.date_range) {
        const dateConditions: any[] = [];
        if (props.body.date_range.start) {
          dateConditions.push({
            created_at: { gte: new Date(props.body.date_range.start) },
          });
        }
        if (props.body.date_range.end) {
          dateConditions.push({
            created_at: { lte: new Date(props.body.date_range.end) },
          });
        }
        if (dateConditions.length > 0) {
          conditions.push({ AND: dateConditions });
        }
      }
      return conditions.length > 0 ? { AND: conditions } : {};
    };
  const queryCustomer = async (): Promise<any[]> => {
    return await MyGlobal.prisma.shopping_mall_customer_password_resets.findMany(
      {
        where: buildCustomerWhere(),
        select: {
          id: true,
          token: true,
          created_at: true,
          expired_at: true,
          deleted_at: true,
          customer: {
            select: { email: true },
          },
        },
      },
    );
  };
  const querySeller = async (): Promise<any[]> => {
    return await MyGlobal.prisma.shopping_mall_seller_password_resets.findMany({
      where: buildSellerWhere(),
      select: {
        id: true,
        token: true,
        created_at: true,
        expires_at: true,
        seller: {
          select: { email: true },
        },
      },
    });
  };
  const queryAdmin = async (): Promise<any[]> => {
    return await MyGlobal.prisma.shopping_mall_administrator_password_resets.findMany(
      {
        where: buildAdminWhere(),
        select: {
          id: true,
          token: true,
          created_at: true,
          expired_at: true,
          deleted_at: true,
          administrator: {
            select: { email: true },
          },
        },
      },
    );
  };
  const countCustomer = async (): Promise<number> => {
    return await MyGlobal.prisma.shopping_mall_customer_password_resets.count({
      where: buildCustomerWhere(),
    });
  };
  const countSeller = async (): Promise<number> => {
    return await MyGlobal.prisma.shopping_mall_seller_password_resets.count({
      where: buildSellerWhere(),
    });
  };
  const countAdmin = async (): Promise<number> => {
    return await MyGlobal.prisma.shopping_mall_administrator_password_resets.count(
      {
        where: buildAdminWhere(),
      },
    );
  };
  const collectAllResults = async (): Promise<any[]> => {
    const results: any[] = [];
    const userTypes: ("customer" | "seller" | "administrator")[] = [];
    if (!props.body.user_type) {
      userTypes.push("customer", "seller", "administrator");
    } else {
      userTypes.push(props.body.user_type);
    }
    for (const userType of userTypes) {
      if (userType === "customer") {
        const customerRecords = await queryCustomer();
        for (const record of customerRecords) {
          results.push({
            id: record.id,
            user_type: "customer" as const,
            user_email: record.customer.email,
            token: record.token,
            created_at: record.created_at,
            expired_at: record.expired_at,
            deleted_at: record.deleted_at,
          });
        }
      } else if (userType === "seller") {
        const sellerRecords = await querySeller();
        for (const record of sellerRecords) {
          results.push({
            id: record.id,
            user_type: "seller" as const,
            user_email: record.seller.email,
            token: record.token,
            created_at: record.created_at,
            expired_at: record.expires_at,
            deleted_at: null,
          });
        }
      } else {
        const adminRecords = await queryAdmin();
        for (const record of adminRecords) {
          results.push({
            id: record.id,
            user_type: "administrator" as const,
            user_email: record.administrator.email,
            token: record.token,
            created_at: record.created_at,
            expired_at: record.expired_at,
            deleted_at: record.deleted_at,
          });
        }
      }
    }
    return results;
  };
  const countAll = async (): Promise<number> => {
    let total = 0;
    const userTypes: ("customer" | "seller" | "administrator")[] = [];
    if (!props.body.user_type) {
      userTypes.push("customer", "seller", "administrator");
    } else {
      userTypes.push(props.body.user_type);
    }
    for (const userType of userTypes) {
      if (userType === "customer") {
        total += await countCustomer();
      } else if (userType === "seller") {
        total += await countSeller();
      } else {
        total += await countAdmin();
      }
    }
    return total;
  };
  const allResults = await collectAllResults();
  allResults.sort((a, b) => {
    let comparison = 0;
    const statusA = computeStatus(a.deleted_at, a.expired_at);
    const statusB = computeStatus(b.deleted_at, b.expired_at);
    if (sortBy === "user_email") {
      comparison = a.user_email.localeCompare(b.user_email);
    } else if (sortBy === "user_type") {
      comparison = a.user_type.localeCompare(b.user_type);
    } else if (sortBy === "status") {
      comparison = statusA.localeCompare(statusB);
    } else if (sortBy === "id") {
      comparison = a.id.localeCompare(b.id);
    } else if (sortBy === "expired_at") {
      comparison = a.expired_at.getTime() - b.expired_at.getTime();
    } else {
      comparison = a.created_at.getTime() - b.created_at.getTime();
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });
  const total = await countAll();
  const skip = (page - 1) * pageSize;
  const paginatedResults = allResults.slice(skip, skip + pageSize);
  const transformRecord = (
    record: any,
  ): IShoppingMallCustomerPasswordReset.ISummary => {
    const status = computeStatus(record.deleted_at, record.expired_at);
    const tokenMasked =
      record.token.length > 4
        ? record.token.substring(0, 4) + "***"
        : record.token + "***";
    return {
      id: record.id,
      user_type: record.user_type,
      user_email: record.user_email,
      token: tokenMasked,
      created_at: record.created_at.toISOString(),
      expired_at: record.expired_at.toISOString(),
      status: status,
      deleted_at: record.deleted_at?.toISOString() ?? null,
    };
  };
  const data = paginatedResults.map(transformRecord);
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: data,
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
// import { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerPasswordResets(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallCustomerPasswordReset.IRequest;
// }): Promise<IPageIShoppingMallCustomerPasswordReset.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------