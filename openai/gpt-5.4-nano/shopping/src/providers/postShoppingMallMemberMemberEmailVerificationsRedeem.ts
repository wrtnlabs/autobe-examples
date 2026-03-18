import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallMemberEmailVerificationCollector } from "../collectors/ShoppingMallMemberEmailVerificationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallMemberEmailVerificationTransformer } from "../transformers/ShoppingMallMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberMemberEmailVerificationsRedeem(props: {
  member: MemberPayload;
  body: IShoppingMallMemberEmailVerification.ICreate;
}): Promise<IShoppingMallMemberEmailVerification> {
  const nowRecord =
    await MyGlobal.prisma.shopping_mall_member_email_verifications.create({
      data: await ShoppingMallMemberEmailVerificationCollector.collect({
        body: props.body,
      }),
      ...ShoppingMallMemberEmailVerificationTransformer.select(),
    });
  return await ShoppingMallMemberEmailVerificationTransformer.transform(
    nowRecord,
  );
}
