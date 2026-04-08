import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorPromotionRequestTransformer } from "../transformers/ShoppingMallAdministratorPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorPromotionRequestsRequestId(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorPromotionRequest> {
  // Verify the administrator is a super administrator
  const adminRecord =
    await MyGlobal.prisma.shopping_mall_administrators.findUnique({
      where: { id: props.administrator.id },
      select: { grade: true },
    });
  if (adminRecord === null || adminRecord.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Query the promotion request by ID
  const record =
    await MyGlobal.prisma.shopping_mall_administrator_promotion_requests.findFirstOrThrow(
      {
        ...ShoppingMallAdministratorPromotionRequestTransformer.select(),
        where: {
          id: props.requestId,
          deleted_at: null,
        },
      },
    );
  // Transform and return
  return await ShoppingMallAdministratorPromotionRequestTransformer.transform(
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
// import { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdministratorPromotionRequestsRequestId(props: {
//   administrator: AdministratorPayload;
//   requestId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallAdministratorPromotionRequest> {
//   const record = await MyGlobal.prisma.shopping_mall_administrator_promotion_requests.findFirstOrThrow({
//     ...ShoppingMallAdministratorPromotionRequestTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallAdministratorPromotionRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------