import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthAdminRequest(props: {
  ip: string;
  body: IEcommerceMallAdmin.IJoin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // Validate actor type
  if (
    props.body.actorType !== "customer" &&
    props.body.actorType !== "seller"
  ) {
    throw new HttpException(
      "Invalid actor type. Must be 'customer' or 'seller'",
      400,
    );
  }
  // Validate requested grade
  if (
    props.body.requestedGrade !== "admin" &&
    props.body.requestedGrade !== "super_admin"
  ) {
    throw new HttpException(
      "Invalid requested grade. Must be 'admin' or 'super_admin'",
      400,
    );
  }
  const actorType = props.body.actorType;
  let actorRecord: {
    id: string;
    email: string;
  } | null = null;
  if (actorType === "customer") {
    actorRecord = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      select: { id: true, email: true },
    });
  } else {
    actorRecord = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      select: { id: true, email: true },
    });
  }
  if (!actorRecord) {
    throw new HttpException(`${actorType} not found`, 404);
  }
  const actorId = actorRecord.id;
  const actorEmail = actorRecord.email;
  // Check if already admin
  const existingAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { email: actorEmail, deleted_at: null },
    select: { id: true },
  });
  if (existingAdmin) {
    throw new HttpException("User is already an administrator", 400);
  }
  const existingSuperAdmin =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
      where: { email: actorEmail, deleted_at: null },
      select: { id: true },
    });
  if (existingSuperAdmin) {
    throw new HttpException("User is already a super administrator", 400);
  }
  // Check for pending admin request
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findFirst({
      where: {
        actor_type: actorType,
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingRequest) {
    throw new HttpException("An active admin request already exists", 409);
  }
  // Generate IDs and timestamps
  const requestId = v4();
  const sessionId = v4();
  const now = new Date();
  const nowIso = toISOStringSafe(now);
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Create admin request with pending status
  await MyGlobal.prisma.ecommerce_mall_admin_requests.create({
    data: {
      id: requestId,
      actor_type: actorType,
      requested_grade: props.body.requestedGrade,
      reason: props.body.reason,
      status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Generate JWT tokens
  const tokenPayload = {
    type: actorType,
    id: actorId,
    session_id: sessionId,
    created_at: nowIso,
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Create session for the requesting actor
  const sessionCreatedAt = new Date();
  const sessionExpiredAt = new Date(Date.now() + 60 * 60 * 1000);
  if (actorType === "customer") {
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.create({
      data: {
        id: sessionId,
        ecommerce_mall_customer_id: actorId,
        access_token: accessToken,
        refresh_token: refreshToken,
        ip: props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: sessionCreatedAt,
        updated_at: sessionCreatedAt,
        expired_at: sessionExpiredAt,
      },
    });
  } else {
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
      data: {
        id: sessionId,
        ecommerce_mall_seller_id: actorId,
        access_token: accessToken,
        refresh_token: refreshToken,
        ip: props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: sessionCreatedAt,
        expired_at: sessionExpiredAt,
      },
    });
  }
  // Return IAuthorized - using request ID as admin ID placeholder since user is not yet an admin
  const result: IEcommerceMallAdmin.IAuthorized = {
    id: requestId,
    email: actorEmail,
    name: `${actorType.charAt(0).toUpperCase() + actorType.slice(1)} Request`,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
  return result;
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
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthAdminRequest(props: {
//   ip: string;
//   body: IEcommerceMallAdmin.IJoin;
// }): Promise<IEcommerceMallAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------