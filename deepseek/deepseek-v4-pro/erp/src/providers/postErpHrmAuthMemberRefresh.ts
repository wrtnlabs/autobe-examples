import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthMemberRefresh(props: {
  body: IErpHrmMember.IRefresh;
}): Promise<IErpHrmMember.IAuthorized> {
  // 1. Verify refresh token (JwtPayload has [key: string]: any index signature)
  let decodedId: string;
  let decodedSessionId: string;
  let decodedType: string;
  let decodedOrganizationId: string | null = null;
  try {
    const verified = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof verified !== "object" || verified === null) {
      throw new HttpException("Invalid token format", 401);
    }
    decodedId = String(verified.id);
    decodedSessionId = String(verified.session_id);
    decodedType = String(verified.type);
    if (
      verified.organization_id !== undefined &&
      verified.organization_id !== null
    ) {
      decodedOrganizationId = String(verified.organization_id);
    }
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type is "member"
  if (decodedType !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Look up session by refresh_token (ensures single-use)
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.findFirst({
    where: {
      refresh_token: props.body.refresh_token,
      erp_hrm_member_id: decodedId,
    },
  });
  if (!session) {
    throw new HttpException(
      "Session not found or refresh token already used",
      401,
    );
  }
  // 4. Validate session not expired (number comparison, no Date annotation)
  if (session.expired_at.getTime() < Date.now()) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Validate member exists and is not soft-deleted
  const member = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: decodedId },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Token rotation — generate new token pair
  const nowMs = Date.now();
  const accessExpiresMs = nowMs + 60 * 60 * 1000; // 1 hour
  const refreshExpiresMs = nowMs + 7 * 24 * 60 * 60 * 1000; // 7 days
  const tokenPayload = {
    type: "member",
    id: decodedId,
    session_id: session.id,
    created_at: new Date(nowMs).toISOString(),
    ...(session.erp_hrm_organization_id !== null && {
      organization_id: session.erp_hrm_organization_id,
    }),
  };
  const newAccessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const newRefreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session with rotated tokens (Date only inside Prisma data block)
  await MyGlobal.prisma.erp_hrm_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: new Date(refreshExpiresMs),
    },
  });
  // 8. Get member's active organizations via employee records
  const employees = await MyGlobal.prisma.erp_hrm_employees.findMany({
    where: {
      erp_hrm_member_id: decodedId,
      deleted_at: null,
    },
    select: {
      erp_hrm_organization_id: true,
    },
  });
  const uniqueOrgIds = [
    ...new Set(employees.map((e) => e.erp_hrm_organization_id)),
  ];
  const organizations: IErpHrmOrganization.ISummary[] = uniqueOrgIds.map(
    (orgId) => ({
      id: typia.assert<string & tags.Format<"uuid">>(orgId),
      name: "",
      description: null,
      logo_image: null,
    }),
  );
  // 9. Build and return authorization response
  return {
    id: typia.assert<string & tags.Format<"uuid">>(member.id),
    email: typia.assert<string & tags.Format<"email">>(member.email),
    display_name: member.display_name,
    avatar_image:
      member.avatar_image !== null
        ? typia.assert<string & tags.Format<"uri">>(member.avatar_image)
        : null,
    phone_number: member.phone_number ?? null,
    created_at: typia.assert<string & tags.Format<"date-time">>(
      member.created_at.toISOString(),
    ),
    updated_at: typia.assert<string & tags.Format<"date-time">>(
      member.updated_at.toISOString(),
    ),
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: typia.assert<string & tags.Format<"date-time">>(
        new Date(accessExpiresMs).toISOString(),
      ),
      refreshable_until: typia.assert<string & tags.Format<"date-time">>(
        new Date(refreshExpiresMs).toISOString(),
      ),
    },
    organizations,
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
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAuthMemberRefresh(props: {
//   body: IErpHrmMember.IRefresh;
// }): Promise<IErpHrmMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------