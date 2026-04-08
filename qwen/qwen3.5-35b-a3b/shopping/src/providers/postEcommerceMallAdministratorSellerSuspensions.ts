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
import { EcommerceMallSellerSuspensionCollector } from "../collectors/EcommerceMallSellerSuspensionCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallSellerSuspensionTransformer } from "../transformers/EcommerceMallSellerSuspensionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdministratorSellerSuspensions(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallSellerSuspension.ICreate;
}): Promise<IEcommerceMallSellerSuspension> {
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.body.seller_id },
    },
  );
  const record = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.create(
    {
      data: await EcommerceMallSellerSuspensionCollector.collect({
        body: props.body,
        ecommerceMallAdministrators: { id: props.administrator.id },
      }),
      ...EcommerceMallSellerSuspensionTransformer.select(),
    },
  );
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
// export async function postEcommerceMallAdministratorSellerSuspensions(props: {
//   administrator: AdministratorPayload;
//   body: IEcommerceMallSellerSuspension.ICreate;
// }): Promise<IEcommerceMallSellerSuspension> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.create({
//     data: await EcommerceMallSellerSuspensionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallSellerSuspensionTransformer.select(),
//   });
//   return await EcommerceMallSellerSuspensionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------