import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallSellerAtRevokeSessionsResultTransformer } from "../transformers/EcommerceMallSellerAtRevokeSessionsResultTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorSellersSellerIdSessions(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceMallSeller.IRevokeSession;
}): Promise<IEcommerceMallSeller.IRevokeSessionsResult> {
  const revokedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  // Verify seller exists and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });
  // Query all active sessions for the seller
  const allActiveSessions =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findMany({
      where: {
        ecommerce_mall_seller_id: props.sellerId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // Determine which sessions to revoke based on request
  const targetSessionIds: Array<string & tags.Format<"uuid">> = [];
  if (props.body.all === true) {
    // Revoke all active sessions
    for (const session of allActiveSessions) {
      targetSessionIds.push(session.id);
    }
  } else if (
    props.body.session_ids !== undefined &&
    props.body.session_ids.length > 0
  ) {
    // Revoke only specified sessions that are active
    const activeSessionIdSet = new Set(
      allActiveSessions.map((session) => session.id),
    );
    for (const requestId of props.body.session_ids) {
      if (activeSessionIdSet.has(requestId)) {
        targetSessionIds.push(requestId);
      }
    }
  }
  // Update each target session with deleted_at timestamp
  if (targetSessionIds.length > 0) {
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.updateMany({
      where: {
        id: {
          in: targetSessionIds,
        },
        deleted_at: null,
      },
      data: {
        deleted_at: revokedAt,
        updated_at: revokedAt,
      },
    });
  }
  // Prepare data for transformer - select the target sessions that were revoked
  const revokedSessionRecords =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findMany({
      where: {
        id: {
          in: targetSessionIds,
        },
      },
      ...EcommerceMallSellerAtRevokeSessionsResultTransformer.select(),
    });
  // Return the result using the transformer
  return await EcommerceMallSellerAtRevokeSessionsResultTransformer.transform(
    revokedSessionRecords,
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorSellersSellerIdSessions(props: {
//   administrator: AdministratorPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IEcommerceMallSeller.IRevokeSession;
// }): Promise<IEcommerceMallSeller.IRevokeSessionsResult> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_sessions.findFirstOrThrow({
//     ...EcommerceMallSellerAtRevokeSessionsResultTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerAtRevokeSessionsResultTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------