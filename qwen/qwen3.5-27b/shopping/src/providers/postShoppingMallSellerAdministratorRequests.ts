import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdministratorRequestCollector } from "../collectors/ShoppingMallAdministratorRequestCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallAdministratorRequestTransformer } from "../transformers/ShoppingMallAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerAdministratorRequests(props: {
  seller: SellerPayload;
  body: IShoppingMallAdministratorRequest.ICreate;
}): Promise<IShoppingMallAdministratorRequest> {
  const record =
    await MyGlobal.prisma.shopping_mall_administrator_requests.create({
      data: await ShoppingMallAdministratorRequestCollector.collect({
        body: props.body,
        shoppingMallSellers: {
          id: props.seller.id,
        } satisfies IEntity,
      }),
      ...ShoppingMallAdministratorRequestTransformer.select(),
    });
  return await ShoppingMallAdministratorRequestTransformer.transform(record);
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
// import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallSellerAdministratorRequests(props: {
//   seller: SellerPayload;
//   body: IShoppingMallAdministratorRequest.ICreate;
// }): Promise<IShoppingMallAdministratorRequest> {
//   const record = await MyGlobal.prisma.shopping_mall_administrator_requests.create({
//     data: await ShoppingMallAdministratorRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallAdministratorRequestTransformer.select(),
//   });
//   return await ShoppingMallAdministratorRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------