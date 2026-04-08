import { IEcommerceMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorUsers(props: {
  administrator: AdministratorPayload;
  body: IPageIEcommerceMallUser.IRequest;
}): Promise<IPageIEcommerceMallUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Note: typeFilter, queryFilter, statusFilter, sortBy, sortOrder don't exist on IRequest
  // Using undefined for these since they're not available
  const typeFilter: string | undefined = undefined;
  const queryFilter: string | undefined = undefined;
  const statusFilter: string | undefined = undefined;
  const sortBy = "created_at";
  const sortOrder = "desc";
  const isUnifiedQuery = typeFilter === undefined;
  let data: Array<IEcommerceMallUser.ISummary> = [];
  let total: number = 0;
  if (isUnifiedQuery) {
    const customerPromise = MyGlobal.prisma.ecommerce_mall_members.findMany({
      where: {
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        email: true,
        display_name: true,
        created_at: true,
        updated_at: true,
      },
    });
    const sellerPromise = MyGlobal.prisma.ecommerce_mall_sellers.findMany({
      where: {
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        email: true,
        display_name: true,
        is_suspended: true,
        approval_status: true,
        created_at: true,
        updated_at: true,
      },
    });
    const adminPromise = MyGlobal.prisma.ecommerce_mall_administrators.findMany(
      {
        where: {
          deleted_at: null,
        },
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          email: true,
          display_name: true,
          grade: true,
          is_banned: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
    const [customers, sellers, admins] = await Promise.all([
      customerPromise,
      sellerPromise,
      adminPromise,
    ]);
    const totalCustomer = await MyGlobal.prisma.ecommerce_mall_members.count({
      where: {
        deleted_at: null,
      },
    });
    const totalSeller = await MyGlobal.prisma.ecommerce_mall_sellers.count({
      where: {
        deleted_at: null,
      },
    });
    const totalAdmin =
      await MyGlobal.prisma.ecommerce_mall_administrators.count({
        where: {
          deleted_at: null,
        },
      });
    const customerData = await ArrayUtil.asyncMap(
      customers,
      async (member) =>
        ({
          id: member.id,
          email: member.email,
          type: "customer" as const,
          display_name: member.display_name,
          approval_status: null,
          grade: null,
          is_banned: false,
          is_suspended: null,
          created_at: toISOStringSafe(member.created_at),
          updated_at: toISOStringSafe(member.updated_at),
        }) as IEcommerceMallUser.ISummary,
    );
    const sellerData = await ArrayUtil.asyncMap(
      sellers,
      async (seller) =>
        ({
          id: seller.id,
          email: seller.email,
          type: "seller" as const,
          display_name: seller.display_name,
          approval_status: seller.approval_status,
          grade: null,
          is_banned: false,
          is_suspended: seller.is_suspended,
          created_at: toISOStringSafe(seller.created_at),
          updated_at: toISOStringSafe(seller.updated_at),
        }) as IEcommerceMallUser.ISummary,
    );
    const adminData = await ArrayUtil.asyncMap(
      admins,
      async (admin) =>
        ({
          id: admin.id,
          email: admin.email,
          type: "administrator" as const,
          display_name: admin.display_name,
          approval_status: null,
          grade: admin.grade,
          is_banned: admin.is_banned,
          is_suspended: null,
          created_at: toISOStringSafe(admin.created_at),
          updated_at: toISOStringSafe(admin.updated_at),
        }) as IEcommerceMallUser.ISummary,
    );
    data = [...customerData, ...sellerData, ...adminData];
    total = totalCustomer + totalSeller + totalAdmin;
  } else {
    if (typeFilter === "customer") {
      const members = await MyGlobal.prisma.ecommerce_mall_members.findMany({
        where: {
          deleted_at: null,
        },
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          email: true,
          display_name: true,
          created_at: true,
          updated_at: true,
        },
      });
      total = await MyGlobal.prisma.ecommerce_mall_members.count({
        where: {
          deleted_at: null,
        },
      });
      data = await ArrayUtil.asyncMap(
        members,
        async (member) =>
          ({
            id: member.id,
            email: member.email,
            type: "customer" as const,
            display_name: member.display_name,
            approval_status: null,
            grade: null,
            is_banned: false,
            is_suspended: null,
            created_at: toISOStringSafe(member.created_at),
            updated_at: toISOStringSafe(member.updated_at),
          }) as IEcommerceMallUser.ISummary,
      );
    } else if (typeFilter === "seller") {
      const sellers = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
        where: {
          deleted_at: null,
        },
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          email: true,
          display_name: true,
          is_suspended: true,
          approval_status: true,
          created_at: true,
          updated_at: true,
        },
      });
      total = await MyGlobal.prisma.ecommerce_mall_sellers.count({
        where: {
          deleted_at: null,
        },
      });
      data = await ArrayUtil.asyncMap(
        sellers,
        async (seller) =>
          ({
            id: seller.id,
            email: seller.email,
            type: "seller" as const,
            display_name: seller.display_name,
            approval_status: seller.approval_status,
            grade: null,
            is_banned: false,
            is_suspended: seller.is_suspended,
            created_at: toISOStringSafe(seller.created_at),
            updated_at: toISOStringSafe(seller.updated_at),
          }) as IEcommerceMallUser.ISummary,
      );
    } else if (typeFilter === "administrator") {
      const admins =
        await MyGlobal.prisma.ecommerce_mall_administrators.findMany({
          where: {
            deleted_at: null,
          },
          skip,
          take: limit,
          orderBy: {
            [sortBy]: sortOrder,
          },
          select: {
            id: true,
            email: true,
            display_name: true,
            grade: true,
            is_banned: true,
            created_at: true,
            updated_at: true,
          },
        });
      total = await MyGlobal.prisma.ecommerce_mall_administrators.count({
        where: {
          deleted_at: null,
        },
      });
      data = await ArrayUtil.asyncMap(
        admins,
        async (admin) =>
          ({
            id: admin.id,
            email: admin.email,
            type: "administrator" as const,
            display_name: admin.display_name,
            approval_status: null,
            grade: admin.grade,
            is_banned: admin.is_banned,
            is_suspended: null,
            created_at: toISOStringSafe(admin.created_at),
            updated_at: toISOStringSafe(admin.updated_at),
          }) as IEcommerceMallUser.ISummary,
      );
    }
  }
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IPageIEcommerceMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUser";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUser";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorUsers(props: {
//   administrator: AdministratorPayload;
//   body: IPageIEcommerceMallUser.IRequest;
// }): Promise<IPageIEcommerceMallUser.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------