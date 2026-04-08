import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdminPromotionRequestCollector } from "../collectors/ShoppingMallAdminPromotionRequestCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallAdminPromotionRequestTransformer } from "../transformers/ShoppingMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberAdminPromotionRequests(props: {
  member: MemberPayload;
  body: IShoppingMallAdminPromotionRequest.ICreate;
}): Promise<IShoppingMallAdminPromotionRequest> {
  const existingPending =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findFirst({
      where: {
        deleted_at: null,
        status: "pending",
        memberApplicant: {
          shopping_mall_member_id: props.member.id,
          deleted_at: null,
        },
      },
    });
  if (existingPending !== null) {
    throw new HttpException(
      "You already have a pending promotion request",
      400,
    );
  }
  const record =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.create({
      data: await ShoppingMallAdminPromotionRequestCollector.collect({
        body: props.body,
        shoppingMallMembers: { id: props.member.id },
        shoppingMallSellers: { id: v4() },
        shoppingMallMemberSessions: { id: props.member.session_id },
        shoppingMallSellerSessions: { id: v4() },
      }),
      ...ShoppingMallAdminPromotionRequestTransformer.select(),
    });
  return await ShoppingMallAdminPromotionRequestTransformer.transform(record);
}
