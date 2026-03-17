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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ShoppingMallAdministratorRequestTransformer } from "../transformers/ShoppingMallAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSuperAdministratorAdministratorRequestsAdministratorRequestId(props: {
  superAdministrator: SuperadministratorPayload;
  administratorRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministratorRequest.IUpdate;
}): Promise<IShoppingMallAdministratorRequest> {
  if (props.superAdministrator.type !== "superadministrator") {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.status === undefined) {
    throw new HttpException("Status is required", 400);
  }
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException("Invalid status", 400);
  }
  if (
    props.body.status === "rejected" &&
    (props.body.rejectionReason === undefined ||
      props.body.rejectionReason === null)
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
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
        },
      });
    if (request.status !== "pending") {
      throw new HttpException("Administrator request is not reviewable", 400);
    }
    await tx.shopping_mall_administrator_requests.update({
      where: {
        id: request.id,
      },
      data: {
        status: props.body.status,
        review_note:
          props.body.reviewNote === undefined
            ? undefined
            : props.body.reviewNote,
        rejection_reason:
          props.body.status === "approved"
            ? null
            : props.body.rejectionReason === undefined
              ? null
              : props.body.rejectionReason,
        reviewed_at: new Date().toISOString(),
        approved_at:
          props.body.status === "approved" ? new Date().toISOString() : null,
        rejected_at:
          props.body.status === "rejected" ? new Date().toISOString() : null,
        reviewed_by_administrator_id: props.superAdministrator.id,
        updated_at: new Date().toISOString(),
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
