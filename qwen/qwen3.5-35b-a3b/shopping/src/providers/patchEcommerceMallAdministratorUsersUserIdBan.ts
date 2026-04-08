import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEcommerceMallUserBanRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallUserBanTransformer } from "../transformers/EcommerceMallUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorUsersUserIdBan(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
  body: IEcommerceMallUserBanRequest;
}): Promise<IEcommerceMallUserBan> {
  const currentDate = new Date();
  // Validate request body - reason required for ban action
  if (props.body.action === "ban" && !props.body.reason) {
    throw new HttpException("Reason is required for ban action", 422);
  }
  // Validate user type
  const userType: "customer" | "seller" = props.body.user_type;
  // Check if user exists
  if (userType === "customer") {
    const customer = await MyGlobal.prisma.ecommerce_mall_members.findUnique({
      where: { id: props.userId },
    });
    if (customer === null) {
      throw new HttpException("Customer not found", 404);
    }
  } else if (userType === "seller") {
    const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
      where: { id: props.userId },
    });
    if (seller === null) {
      throw new HttpException("Seller not found", 404);
    }
  } else {
    throw new HttpException("Invalid user type", 422);
  }
  // Check if user is already banned (active ban = deleted_at IS NULL)
  const existingBan = await MyGlobal.prisma.ecommerce_mall_user_bans.findFirst({
    where: {
      user_type: userType,
      deleted_at: null,
      ...(userType === "customer"
        ? {
            customerBan: {
              deleted_at: null,
              customer_id: props.userId,
            },
          }
        : {
            sellerBan: {
              deleted_at: null,
              seller_id: props.userId,
            },
          }),
    },
    ...EcommerceMallUserBanTransformer.select(),
  });
  if (props.body.action === "ban") {
    if (existingBan !== null) {
      throw new HttpException("User is already banned", 409);
    }
    // Create new ban record
    const banId = v4() as string & tags.Format<"uuid">;
    // Create main ban record with subtype
    const createdBan = await MyGlobal.prisma.ecommerce_mall_user_bans.create({
      data: {
        id: banId,
        administrator_id: props.administrator.id,
        user_type: userType,
        reason: props.body.reason!,
        banned_at: currentDate,
        created_at: currentDate,
        updated_at: currentDate,
        deleted_at: null,
        ...(userType === "customer"
          ? {
              customerBan: {
                create: {
                  id: banId,
                  customer_id: props.userId,
                  created_at: currentDate,
                  updated_at: currentDate,
                  deleted_at: null,
                },
              },
            }
          : {
              sellerBan: {
                create: {
                  id: banId,
                  seller_id: props.userId,
                  created_at: currentDate,
                  updated_at: currentDate,
                  deleted_at: null,
                },
              },
            }),
      },
      ...EcommerceMallUserBanTransformer.select(),
    });
    return await EcommerceMallUserBanTransformer.transform(createdBan);
  } else {
    // UNBANNING - find active ban record
    if (existingBan === null) {
      throw new HttpException("No active ban found for user", 404);
    }
    const banId = existingBan.id;
    // Soft delete main ban record
    await MyGlobal.prisma.ecommerce_mall_user_bans.update({
      where: { id: banId },
      data: {
        deleted_at: currentDate,
        updated_at: currentDate,
      },
    });
    // Soft delete subtype record
    if (userType === "customer") {
      await MyGlobal.prisma.ecommerce_mall_user_ban_of_customers.update({
        where: { id: banId },
        data: {
          deleted_at: currentDate,
        },
      });
    } else {
      await MyGlobal.prisma.ecommerce_mall_user_ban_of_sellers.update({
        where: { id: banId },
        data: {
          deleted_at: currentDate,
        },
      });
    }
    // Fetch updated ban record for response
    const updatedBan =
      await MyGlobal.prisma.ecommerce_mall_user_bans.findUniqueOrThrow({
        where: { id: banId },
        ...EcommerceMallUserBanTransformer.select(),
      });
    return await EcommerceMallUserBanTransformer.transform(updatedBan);
  }
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
// import { IEcommerceMallUserBanRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanRequest";
// import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// import { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorUsersUserIdBan(props: {
//   administrator: AdministratorPayload;
//   userId: string & tags.Format<"uuid">;
//   body: IEcommerceMallUserBanRequest;
// }): Promise<IEcommerceMallUserBan> {
//   const record = await MyGlobal.prisma.ecommerce_mall_user_bans.findFirstOrThrow({
//     ...EcommerceMallUserBanTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallUserBanTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------