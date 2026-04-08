import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallUserBanCollector } from "../collectors/EcommerceMallUserBanCollector";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallUserBanTransformer } from "../transformers/EcommerceMallUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postEcommerceMallSuperAdministratorUserBans(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallUserBan.ICreate;
}): Promise<IEcommerceMallUserBan> {
  const user_type = props.body.user_type;
  const reason = props.body.reason;
  // Validate user_type is valid discriminator value
  if (user_type !== "customer" && user_type !== "seller") {
    throw new HttpException("Invalid user_type", 400);
  }
  // Validate appropriate ID is provided based on user_type
  if (user_type === "customer" && !props.body.customer_id) {
    throw new HttpException(
      "customer_id is required when user_type is customer",
      400,
    );
  }
  if (user_type === "seller" && !props.body.seller_id) {
    throw new HttpException(
      "seller_id is required when user_type is seller",
      400,
    );
  }
  // Validate reason is within allowed length
  const reasonLength = reason.length;
  if (reasonLength < 1 || reasonLength > 500) {
    throw new HttpException("Reason must be 1-500 characters", 400);
  }
  // Check if user exists before creating ban
  if (user_type === "customer") {
    const customerExists =
      await MyGlobal.prisma.ecommerce_mall_members.findUnique({
        where: { id: props.body.customer_id! },
        select: { id: true },
      });
    if (!customerExists) {
      throw new HttpException("Customer not found", 404);
    }
  } else if (user_type === "seller") {
    const sellerExists =
      await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
        where: { id: props.body.seller_id! },
        select: { id: true },
      });
    if (!sellerExists) {
      throw new HttpException("Seller not found", 404);
    }
  }
  // Check for existing active bans (duplicate prevention)
  if (user_type === "customer") {
    const existingBan =
      await MyGlobal.prisma.ecommerce_mall_user_ban_of_customers.findFirst({
        where: {
          customer_id: props.body.customer_id!,
          deleted_at: null,
        },
      });
    if (existingBan) {
      throw new HttpException("User is already banned", 409);
    }
  } else if (user_type === "seller") {
    const existingBan =
      await MyGlobal.prisma.ecommerce_mall_user_ban_of_sellers.findFirst({
        where: {
          seller_id: props.body.seller_id!,
          deleted_at: null,
        },
      });
    if (existingBan) {
      throw new HttpException("User is already banned", 409);
    }
  }
  // Create the ban record using the collector
  const record = await MyGlobal.prisma.ecommerce_mall_user_bans.create({
    data: await EcommerceMallUserBanCollector.collect({
      body: props.body,
      administrator: {
        id: props.superAdministrator.id,
      },
    }),
    ...EcommerceMallUserBanTransformer.select(),
  });
  return await EcommerceMallUserBanTransformer.transform(record);
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
// import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// import { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSuperAdministratorUserBans(props: {
//   superAdministrator: SuperadministratorPayload;
//   body: IEcommerceMallUserBan.ICreate;
// }): Promise<IEcommerceMallUserBan> {
//   const record = await MyGlobal.prisma.ecommerce_mall_user_bans.create({
//     data: await EcommerceMallUserBanCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallUserBanTransformer.select(),
//   });
//   return await EcommerceMallUserBanTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------