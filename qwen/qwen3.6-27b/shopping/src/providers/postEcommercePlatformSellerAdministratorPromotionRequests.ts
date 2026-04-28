import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer } from "../transformers/EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformSellerAdministratorPromotionRequests(props: {
  seller: SellerPayload;
  body: IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate;
}): Promise<IEcommercePlatformAdministratorPromotionRequestOfCustomer> {
  if (props.body.actorType !== "seller") {
    throw new HttpException("Actor type must be seller", 400);
  }
  const existing =
    await MyGlobal.prisma.ecommerce_platform_administrator_promotion_requests.findFirst(
      {
        where: {
          actor_type: "seller",
          status: "pending",
          sellerSubtype: {
            seller: {
              id: props.seller.id,
            },
          },
        },
      },
    );
  if (existing) {
    throw new HttpException(
      "Seller already has a pending promotion request",
      409,
    );
  }
  const now = new Date();
  const record =
    await MyGlobal.prisma.ecommerce_platform_administrator_promotion_requests.create(
      {
        data: {
          id: v4(),
          actor_type: props.body.actorType,
          status: "pending",
          reason: props.body.reason,
          rejection_reason: null,
          reviewed_at: null,
          created_at: now,
          updated_at: now,
          reviewedByAdmin: undefined,
          customerPromotionSubtype: undefined,
          sellerSubtype: {
            create: {
              id: v4(),
              seller: { connect: { id: props.seller.id } },
              created_at: now,
              updated_at: now,
            },
          },
        },
        ...EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer.select(),
      },
    );
  return await EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer.transform(
    record,
  );
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
// import { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
// import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformSellerAdministratorPromotionRequests(props: {
//   seller: SellerPayload;
//   body: IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate;
// }): Promise<IEcommercePlatformAdministratorPromotionRequestOfCustomer> {
//   const record = await MyGlobal.prisma.ecommerce_platform_administrator_promotion_requests.create({
//     data: await EcommercePlatformAdministratorPromotionRequestOfCustomerCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer.select(),
//   });
//   return await EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------