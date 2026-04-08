import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorPromotionRequestSnapshotTransformer } from "../transformers/ShoppingMallAdministratorPromotionRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorPromotionRequestsRequestIdSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorPromotionRequestSnapshot> {
  const record =
    await MyGlobal.prisma.shopping_mall_administrator_promotion_request_snapshots.findFirstOrThrow(
      {
        ...ShoppingMallAdministratorPromotionRequestSnapshotTransformer.select(),
        where: {
          id: props.snapshotId,
          shopping_mall_administrator_promotion_request_id: props.requestId,
        },
      },
    );
  return await ShoppingMallAdministratorPromotionRequestSnapshotTransformer.transform(
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
// import { IShoppingMallAdministratorPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdministratorPromotionRequestsRequestIdSnapshotsSnapshotId(props: {
//   administrator: AdministratorPayload;
//   requestId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallAdministratorPromotionRequestSnapshot> {
//   const record = await MyGlobal.prisma.shopping_mall_administrator_promotion_request_snapshots.findFirstOrThrow({
//     ...ShoppingMallAdministratorPromotionRequestSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallAdministratorPromotionRequestSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------