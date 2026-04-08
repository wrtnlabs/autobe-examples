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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallAdministratorAtSummaryTransformer } from "../transformers/EcommerceMallAdministratorAtSummaryTransformer";
import { EcommerceMallUserBanOfCustomerAtSummaryTransformer } from "../transformers/EcommerceMallUserBanOfCustomerAtSummaryTransformer";
import { EcommerceMallUserBanOfSellerAtSummaryTransformer } from "../transformers/EcommerceMallUserBanOfSellerAtSummaryTransformer";
import { EcommerceMallUserBanTransformer } from "../transformers/EcommerceMallUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdministratorUserBans(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallUserBan.ICreate;
}): Promise<IEcommerceMallUserBan> {
  // Validate user_type
  if (
    props.body.user_type !== "customer" &&
    props.body.user_type !== "seller"
  ) {
    throw new HttpException("Invalid user_type", 400);
  }
  // Validate that the correct reference ID is provided based on user_type
  if (props.body.user_type === "customer") {
    if (!props.body.customer_id) {
      throw new HttpException("customer_id is required for customer ban", 400);
    }
    // Verify customer exists
    await MyGlobal.prisma.ecommerce_mall_members.findUniqueOrThrow({
      where: { id: props.body.customer_id },
    });
  } else if (props.body.user_type === "seller") {
    if (!props.body.seller_id) {
      throw new HttpException("seller_id is required for seller ban", 400);
    }
    // Verify seller exists
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.body.seller_id },
    });
  }
  // Check for existing active ban to prevent duplicate bans
  const existingBan = await MyGlobal.prisma.ecommerce_mall_user_bans.findFirst({
    where: {
      user_type: props.body.user_type,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existingBan !== null) {
    throw new HttpException("User is already banned", 409);
  }
  // Create the ban record using collector
  const record = await MyGlobal.prisma.ecommerce_mall_user_bans.create({
    data: await EcommerceMallUserBanCollector.collect({
      body: props.body,
      administrator: {
        id: props.administrator.id,
      } as IEcommerceMallAdministrator.ISummary,
    }),
    select: {
      id: true,
      user_type: true,
      reason: true,
      banned_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      administrator: EcommerceMallAdministratorAtSummaryTransformer.select(),
      customerBan: EcommerceMallUserBanOfCustomerAtSummaryTransformer.select(),
      sellerBan: EcommerceMallUserBanOfSellerAtSummaryTransformer.select(),
    },
  });
  // Transform and return the created ban record
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
// export async function postEcommerceMallAdministratorUserBans(props: {
//   administrator: AdministratorPayload;
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