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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallAdministratorRequestTransformer } from "../transformers/ShoppingMallAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerAdministratorRequestsAdministratorRequestId(props: {
  seller: SellerPayload;
  administratorRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorRequest> {
  // Query with authorization check - seller can only view their own request
  const record =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findFirst({
      where: {
        id: props.administratorRequestId,
        actor_type: "seller",
        sellerRequest: {
          shopping_mall_seller_id: props.seller.id,
          deleted_at: null,
        },
      },
    });
  // If not found with authorization, check if request exists at all
  if (record === null) {
    const exists =
      await MyGlobal.prisma.shopping_mall_administrator_requests.findUnique({
        where: { id: props.administratorRequestId },
        select: { id: true },
      });
    // Request exists but seller not authorized
    if (exists !== null) {
      throw new HttpException("Forbidden", 403);
    }
    // Request doesn't exist - throw 404
    throw new HttpException("Not Found", 404);
  }
  // Fetch full record with transformer select and transform
  const fullRecord =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.administratorRequestId },
        ...ShoppingMallAdministratorRequestTransformer.select(),
      },
    );
  return await ShoppingMallAdministratorRequestTransformer.transform(
    fullRecord,
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
// import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallSellerAdministratorRequestsAdministratorRequestId(props: {
//   seller: SellerPayload;
//   administratorRequestId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallAdministratorRequest> {
//   const record = await MyGlobal.prisma.shopping_mall_administrator_requests.findFirstOrThrow({
//     ...ShoppingMallAdministratorRequestTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallAdministratorRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------