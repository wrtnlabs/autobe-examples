import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallMemberEmailVerificationTransformer } from "../transformers/ShoppingMallMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberMemberEmailVerificationsRedeem(props: {
  member: MemberPayload;
  body: IShoppingMallMemberEmailVerification.ICreate;
}): Promise<IShoppingMallMemberEmailVerification> {
  const token = props.body.token;
  const now = new Date();
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const updated =
      await tx.shopping_mall_member_email_verifications.updateMany({
        where: {
          token,
          deleted_at: null,
          used_at: null,
          expires_at: { gte: now },
        },
        data: {
          used_at: now,
          updated_at: now,
        },
      });
    if (updated.count !== 1) {
      throw new HttpException("Invalid or expired verification token", 400);
    }
    const record =
      await tx.shopping_mall_member_email_verifications.findUniqueOrThrow({
        where: { token },
        ...ShoppingMallMemberEmailVerificationTransformer.select(),
      });
    return await ShoppingMallMemberEmailVerificationTransformer.transform(
      record,
    );
  });
  return result;
}
