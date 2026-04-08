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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdminPromotionRequestTransformer } from "../transformers/ShoppingMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSuperAdminAdminPromotionRequestsRequestId(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminPromotionRequest.IUpdate;
}): Promise<IShoppingMallAdminPromotionRequest> {
  const request =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId, deleted_at: null },
        select: {
          id: true,
          status: true,
          actor_type: true,
        },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException("Promotion request has already been reviewed", 400);
  }
  if (
    props.body.status === "rejected" &&
    (props.body.rejection_note === undefined ||
      props.body.rejection_note === null ||
      props.body.rejection_note.trim() === "")
  ) {
    throw new HttpException(
      "Rejection note is required when rejecting a promotion request",
      400,
    );
  }
  if (props.body.status === "approved") {
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.shopping_mall_admin_promotion_requests.update({
        where: { id: props.requestId },
        data: {
          status: props.body.status,
          rejection_note: props.body.rejection_note ?? null,
          reviewed_by_super_admin_id: props.superAdmin.id,
          updated_at: new Date(),
        },
      });
      if (request.actor_type === "member") {
        const memberSubtype =
          await tx.shopping_mall_admin_promotion_request_of_members.findUniqueOrThrow(
            {
              where: {
                shopping_mall_admin_promotion_request_id: props.requestId,
              },
              select: {
                shopping_mall_member_id: true,
              },
            },
          );
        await tx.shopping_mall_administrators.create({
          data: {
            id: v4(),
            shopping_mall_member_id: memberSubtype.shopping_mall_member_id,
            grade: "regular",
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });
      } else {
        const sellerSubtype =
          await tx.shopping_mall_admin_promotion_request_of_sellers.findUniqueOrThrow(
            {
              where: {
                shopping_mall_admin_promotion_request_id: props.requestId,
              },
              select: {
                shopping_mall_seller_id: true,
              },
            },
          );
        await tx.shopping_mall_administrators.create({
          data: {
            id: v4(),
            shopping_mall_member_id: sellerSubtype.shopping_mall_seller_id,
            grade: "regular",
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });
      }
    });
  } else {
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.update({
      where: { id: props.requestId },
      data: {
        status: props.body.status,
        rejection_note: props.body.rejection_note ?? null,
        reviewed_by_super_admin_id: props.superAdmin.id,
        updated_at: new Date(),
      },
    });
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ShoppingMallAdminPromotionRequestTransformer.select(),
      },
    );
  return await ShoppingMallAdminPromotionRequestTransformer.transform(updated);
}
