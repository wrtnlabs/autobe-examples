import { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSellersSellerIdSessions(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerSession.IInvalidateRequest;
}): Promise<IEcommerceMallSellerSession.IInvalidateResponse> {
  // Validate seller exists and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: { id: true },
  });
  // Build WHERE clause for session invalidation
  const whereClause = {
    ecommerce_mall_seller_id: props.sellerId,
    ...(props.body.sessionIds && props.body.sessionIds.length > 0
      ? { id: { in: props.body.sessionIds } }
      : {}),
    ...(props.body.sessionId ? { id: { not: props.body.sessionId } } : {}),
  } satisfies Prisma.ecommerce_mall_seller_sessionsWhereInput;
  // Find sessions to invalidate (to return their IDs)
  const sessions =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findMany({
      where: whereClause,
      select: { id: true },
    });
  // Invalidate sessions by clearing tokens
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.updateMany({
    where: whereClause,
    data: {
      access_token: null,
      refresh_token: null,
    },
  });
  const invalidatedIds: (string & tags.Format<"uuid">)[] = sessions.map(
    (s) => s.id,
  );
  return {
    sessionIds: invalidatedIds,
    count: invalidatedIds.length as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
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
// import { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminSellersSellerIdSessions(props: {
//   admin: AdminPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IEcommerceMallSellerSession.IInvalidateRequest;
// }): Promise<IEcommerceMallSellerSession.IInvalidateResponse> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------