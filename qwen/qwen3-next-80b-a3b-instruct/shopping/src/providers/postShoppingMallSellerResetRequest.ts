import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerResetRequest(props: {
  seller: SellerPayload;
  body: {
    email: string;
  };
}): Promise<IShoppingMallSnapshot.IResetResponse> {
  const { email } = props.body;
  // Look up seller by email
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email, deleted_at: null },
  });
  // Generate UUID for audit
  const token_id = v4() as string & tags.Format<"uuid">;
  // Generate cryptographically secure random token
  const token = v4();
  // Set expiration to 60 minutes from now
  const expires_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  // Current timestamp
  const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  // Always create a reset record (security: prevent enumeration)
  await MyGlobal.prisma.shopping_mall_seller_password_resets.create({
    data: {
      id: token_id,
      shopping_mall_seller_id: seller?.id ?? undefined,
      token,
      expires_at,
      created_at,
      updated_at: created_at,
    } as any,
  });
  // Return only the audit token_id
  return { token_id };
}
