import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallMemberTransformer } from "../transformers/ShoppingMallMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthMemberRefresh(props: {
  body: IShoppingMallMember.IRefresh;
}): Promise<IShoppingMallMember.IAuthorized> {
  // 1. Verify refresh token
  const decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  });
  // 2. Validate token structure using typia (NO 'as' assertions)
  const tokenPayload = typia.assert<{
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: string;
    tokenType?: string;
    created_at: string & tags.Format<"date-time">;
  }>(decoded);
  // 3. Validate token type is member
  if (tokenPayload.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 4. Validate it's a refresh token
  if (tokenPayload.tokenType !== "refresh") {
    throw new HttpException("Invalid token type", 403);
  }
  // 5. Validate session exists
  const session = await MyGlobal.prisma.shopping_mall_member_sessions.findFirst(
    {
      where: {
        id: tokenPayload.session_id,
        shopping_mall_member_id: tokenPayload.id,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 6. Check session not expired (convert Date to ISO string for comparison)
  const now = new Date().toISOString();
  const sessionExpiredAt = session.expired_at.toISOString();
  if (sessionExpiredAt < now) {
    throw new HttpException("Session expired", 401);
  }
  // 7. Validate member not deleted
  const member = await MyGlobal.prisma.shopping_mall_members.findUniqueOrThrow({
    where: { id: tokenPayload.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 8. Generate new tokens (SAME session_id)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: tokenPayload.id,
        session_id: tokenPayload.session_id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: tokenPayload.id,
        session_id: tokenPayload.session_id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 9. Update session expiration
  await MyGlobal.prisma.shopping_mall_member_sessions.update({
    where: { id: tokenPayload.session_id },
    data: { expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  // 10. Query member with all relations
  const memberData =
    await MyGlobal.prisma.shopping_mall_members.findUniqueOrThrow({
      where: { id: tokenPayload.id },
      ...ShoppingMallMemberTransformer.select(),
    });
  // 11. Transform member data
  const transformedMember =
    await ShoppingMallMemberTransformer.transform(memberData);
  // 12. Return authorized response
  return {
    id: transformedMember.id,
    email: transformedMember.email,
    status: transformedMember.status,
    profile: transformedMember.profile,
    administrator: transformedMember.administrator,
    created_at: transformedMember.created_at,
    updated_at: transformedMember.updated_at,
    deleted_at: transformedMember.deleted_at,
    token: token,
  } satisfies IShoppingMallMember.IAuthorized;
}
