import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallSellerSuspensionTransformer } from "../transformers/EcommerceMallSellerSuspensionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdministratorSellerSuspensionsSuspensionId(props: {
  administrator: AdministratorPayload;
  suspensionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerSuspension> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findUniqueOrThrow({
      where: { id: props.suspensionId },
      ...EcommerceMallSellerSuspensionTransformer.select(),
    });
  return await EcommerceMallSellerSuspensionTransformer.transform(record);
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
// import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdministratorSellerSuspensionsSuspensionId(props: {
//   administrator: AdministratorPayload;
//   suspensionId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSellerSuspension> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findFirstOrThrow({
//     ...EcommerceMallSellerSuspensionTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerSuspensionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------