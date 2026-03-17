import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActor";
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

export async function putShoppingMallSellerPassword(props: {
  seller: SellerPayload;
  body: IShoppingMallActor.IPasswordUpdate;
}): Promise<IShoppingMallActor.ISummary> {
  // 1. Fetch seller record with password_hash
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.seller.id },
    select: {
      id: true,
      email: true,
      shop_name: true,
      password_hash: true,
    },
  });
  // 2. Verify current password
  const isCurrentPasswordValid = await PasswordUtil.verify(
    props.body.current_password,
    seller.password_hash,
  );
  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password does not match", 400);
  }
  // 3. Verify new password is not same as current
  const isNewPasswordSameAsCurrent = await PasswordUtil.verify(
    props.body.new_password,
    seller.password_hash,
  );
  if (isNewPasswordSameAsCurrent) {
    throw new HttpException(
      "New password cannot be the same as current password",
      400,
    );
  }
  // 4. Hash the new password
  const newPasswordHash = await PasswordUtil.hash(props.body.new_password);
  // 5. Update password in database
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.seller.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    },
  });
  // 6. Return seller summary
  return {
    type: "seller",
    id: seller.id,
    email: seller.email,
    shopName: seller.shop_name,
  };
}
