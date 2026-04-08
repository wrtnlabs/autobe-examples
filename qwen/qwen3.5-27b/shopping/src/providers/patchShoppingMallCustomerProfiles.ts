import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerProfile";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

export async function patchShoppingMallCustomerProfiles(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerProfile.IRequest;
}): Promise<IPageIShoppingMallCustomerProfile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Build base where clause for customer profiles
  const customerBaseWhere: Prisma.shopping_mall_customer_profilesWhereInput = {
    deleted_at: null,
    customer: {
      deleted_at: null,
    },
  };
  // Build base where clause for seller profiles
  const sellerBaseWhere: Prisma.shopping_mall_seller_profilesWhereInput = {
    deleted_at: null,
    seller: {
      deleted_at: null,
    },
  };
  // Apply is_banned filter
  if (props.body.is_banned !== undefined) {
    customerBaseWhere.customer = {
      deleted_at: null,
      banned: props.body.is_banned,
    };
    sellerBaseWhere.seller = {
      deleted_at: null,
      banned: props.body.is_banned,
    };
  }
  // Apply is_suspended filter (sellers only)
  if (props.body.is_suspended !== undefined) {
    sellerBaseWhere.is_suspended = props.body.is_suspended;
  }
  // Apply approval_status filter (sellers only)
  if (props.body.approval_status !== undefined) {
    sellerBaseWhere.approval_status = props.body.approval_status;
  }
  // Apply date range filters
  if (props.body.created_after || props.body.created_before) {
    customerBaseWhere.created_at = {};
    sellerBaseWhere.created_at = {};
    if (props.body.created_after) {
      customerBaseWhere.created_at.gte = new Date(props.body.created_after);
      sellerBaseWhere.created_at.gte = new Date(props.body.created_after);
    }
    if (props.body.created_before) {
      customerBaseWhere.created_at.lt = new Date(props.body.created_before);
      sellerBaseWhere.created_at.lt = new Date(props.body.created_before);
    }
  }
  // Apply search filter
  if (props.body.search) {
    if (!props.body.profile_type || props.body.profile_type === "customer") {
      customerBaseWhere.OR = [
        { display_name: { contains: props.body.search, mode: "insensitive" } },
        {
          customer: {
            email: { contains: props.body.search, mode: "insensitive" },
          },
        },
      ];
    }
    if (!props.body.profile_type || props.body.profile_type === "seller") {
      sellerBaseWhere.OR = [
        { shop_name: { contains: props.body.search, mode: "insensitive" } },
        {
          shop_description: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        {
          seller: {
            email: { contains: props.body.search, mode: "insensitive" },
          },
        },
      ];
    }
  }
  // Query customer profiles
  let customerProfiles: any[] = [];
  let customerTotal = 0;
  if (!props.body.profile_type || props.body.profile_type === "customer") {
    customerTotal = await MyGlobal.prisma.shopping_mall_customer_profiles.count(
      {
        where: customerBaseWhere,
      },
    );
    customerProfiles =
      await MyGlobal.prisma.shopping_mall_customer_profiles.findMany({
        where: customerBaseWhere,
        orderBy: { created_at: "desc" },
        include: {
          customer: {
            select: {
              email: true,
              banned: true,
            },
          },
        },
      });
  }
  // Query seller profiles
  let sellerProfiles: any[] = [];
  let sellerTotal = 0;
  if (!props.body.profile_type || props.body.profile_type === "seller") {
    sellerTotal = await MyGlobal.prisma.shopping_mall_seller_profiles.count({
      where: sellerBaseWhere,
    });
    sellerProfiles =
      await MyGlobal.prisma.shopping_mall_seller_profiles.findMany({
        where: sellerBaseWhere,
        orderBy: { created_at: "desc" },
        include: {
          seller: {
            select: {
              email: true,
              banned: true,
            },
          },
        },
      });
  }
  // Transform customer profiles to ISummary
  const customerSummaries: IShoppingMallCustomerProfile.ISummary[] =
    customerProfiles.map((profile) => ({
      profile_type: "customer",
      id: profile.id,
      email: profile.customer.email,
      display_name: profile.display_name,
      phone_number: profile.phone_number,
      created_at: toISOStringSafe(profile.created_at),
      is_banned: profile.customer.banned,
    }));
  // Transform seller profiles to ISummary
  const sellerSummaries: IShoppingMallCustomerProfile.ISummary[] =
    sellerProfiles.map((profile) => ({
      profile_type: "seller",
      id: profile.id,
      email: profile.seller.email,
      shop_name: profile.shop_name,
      logo_uri: profile.logo_uri,
      approval_status: profile.approval_status,
      is_suspended: profile.is_suspended,
      is_banned: profile.seller.banned,
      created_at: toISOStringSafe(profile.created_at),
    }));
  // Combine and sort all results by created_at descending
  const allSummaries = [...customerSummaries, ...sellerSummaries].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  // Apply pagination
  const skip = (page - 1) * limit;
  const paginatedData = allSummaries.slice(skip, skip + limit);
  const total = customerTotal + sellerTotal;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: paginatedData,
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
// import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
// import { IPageIShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerProfile";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerProfiles(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallCustomerProfile.IRequest;
// }): Promise<IPageIShoppingMallCustomerProfile.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------