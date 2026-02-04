import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallAdminPasswordResetTransformer } from "../transformers/ShoppingMallAdminPasswordResetTransformer";

export async function postShoppingMallSellerAdminsRequests(props: {
  seller: SellerPayload;
  body: IShoppingMallAdminPasswordReset.ICreate;
}): Promise<IShoppingMallAdminPasswordReset> {
  const created =
    await MyGlobal.prisma.shopping_mall_admin_password_resets.create({
      data: {
        id: v4(),
        admin_id: props.seller.id,
        session_id: props.seller.session_id,
        status: "pending",
        created_at: toISOStringSafe(new Date()),
        token: "", // Must be included as required by transformer's Payload type
        expires_at: toISOStringSafe(new Date()),
        used_at: null,
        // Construct admin object with required fields to satisfy transformer's Payload type
        admin: {
          id: props.seller.id,
          email: "",
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          deleted_at: null,
          password_hash: "",
          totp_secret: null,
          totp_enabled: false,
        },
      },
    });
  return ShoppingMallAdminPasswordResetTransformer.transform(created);
}
