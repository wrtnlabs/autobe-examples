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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallAdminPromotionRequestTransformer } from "../transformers/ShoppingMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberAdminPromotionRequestsRequestId(props: {
  member: MemberPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminPromotionRequest> {
  const record =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findFirstOrThrow(
      {
        ...ShoppingMallAdminPromotionRequestTransformer.select(),
        where: {
          id: props.requestId,
          deleted_at: null,
        },
      },
    );
  // Check authorization: member can access their own requests
  // Verify via subtype table shopping_mall_admin_promotion_request_of_members
  const memberOwnership =
    await MyGlobal.prisma.shopping_mall_admin_promotion_request_of_members.findFirst(
      {
        where: {
          shopping_mall_admin_promotion_request_id: props.requestId,
          shopping_mall_member_id: props.member.id,
        },
      },
    );
  if (memberOwnership) {
    return await ShoppingMallAdminPromotionRequestTransformer.transform(record);
  }
  // Check if user is a super administrator
  const superAdmin = await MyGlobal.prisma.shopping_mall_super_admins.findFirst(
    {
      where: {
        id: props.member.id,
        deleted_at: null,
      },
    },
  );
  if (superAdmin) {
    return await ShoppingMallAdminPromotionRequestTransformer.transform(record);
  }
  throw new HttpException("Forbidden", 403);
}
