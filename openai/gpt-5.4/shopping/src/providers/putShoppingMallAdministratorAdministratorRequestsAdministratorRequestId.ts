import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorRequestTransformer } from "../transformers/ShoppingMallAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorAdministratorRequestsAdministratorRequestId(props: {
  administrator: AdministratorPayload;
  administratorRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministratorRequest.IUpdate;
}): Promise<IShoppingMallAdministratorRequest> {
  if (props.body.status === undefined)
    throw new HttpException("Review status is required", 400);
  if (props.body.status !== "approved" && props.body.status !== "rejected")
    throw new HttpException("Invalid review status", 400);
  if (
    props.body.status === "rejected" &&
    (props.body.rejectionReason === undefined ||
      props.body.rejectionReason === null)
  )
    throw new HttpException("Rejection reason is required", 400);
  const now: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new Date().toISOString());
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const request =
      await tx.shopping_mall_administrator_requests.findFirstOrThrow({
        where: {
          id: props.administratorRequestId,
          deleted_at: null,
        },
        select: {
          id: true,
          status: true,
          review_note: true,
        },
      });
    if (request.status !== "pending")
      throw new HttpException(
        "Administrator request is already finalized",
        409,
      );
    await tx.shopping_mall_administrator_requests.update({
      where: {
        id: request.id,
      },
      data:
        props.body.status === "approved"
          ? {
              status: "approved",
              review_note:
                props.body.reviewNote === undefined
                  ? request.review_note
                  : props.body.reviewNote,
              rejection_reason: null,
              reviewed_at: now,
              approved_at: now,
              rejected_at: null,
              reviewed_by_administrator_id: props.administrator.id,
              updated_at: now,
            }
          : {
              status: "rejected",
              review_note:
                props.body.reviewNote === undefined
                  ? request.review_note
                  : props.body.reviewNote,
              rejection_reason: props.body.rejectionReason,
              reviewed_at: now,
              approved_at: null,
              rejected_at: now,
              reviewed_by_administrator_id: props.administrator.id,
              updated_at: now,
            },
    });
    return await tx.shopping_mall_administrator_requests.findUniqueOrThrow({
      where: {
        id: request.id,
      },
      ...ShoppingMallAdministratorRequestTransformer.select(),
    });
  });
  return await ShoppingMallAdministratorRequestTransformer.transform(updated);
}
