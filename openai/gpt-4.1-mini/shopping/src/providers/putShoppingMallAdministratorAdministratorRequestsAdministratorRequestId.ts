import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Verify if the administrator is a super administrator
  const isSuperAdmin =
    await MyGlobal.prisma.shopping_mall_administrators.findFirst({
      where: {
        id: props.administrator.id,
        deleted_at: null,
        // grade property removed because it is invalid in where input
      },
    });
  if (!isSuperAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch existing administrator request
  const request =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.administratorRequestId },
      },
    );
  // Validate status transition
  if (props.body.status !== undefined) {
    const validStatuses = ["pending", "approved", "rejected"] as const;
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException("Invalid status value", 400);
    }
    if (request.status !== "pending" && props.body.status !== request.status) {
      throw new HttpException("Status can only be changed from pending", 400);
    }
  }
  // Prepare updated_at timestamp string with toISOStringSafe
  const updated_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  // Prepare update payload
  const updateData: {
    status?: "pending" | "approved" | "rejected";
    reason?: string;
    updated_at: string & tags.Format<"date-time">;
  } = { updated_at };
  if (props.body.status !== undefined) updateData.status = props.body.status;
  if (props.body.reason !== undefined) updateData.reason = props.body.reason;
  // Persist updates
  await MyGlobal.prisma.shopping_mall_administrator_requests.update({
    where: { id: props.administratorRequestId },
    data: updateData,
  });
  // Retrieve updated record
  const updated =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.administratorRequestId },
        ...ShoppingMallAdministratorRequestTransformer.select(),
      },
    );
  return await ShoppingMallAdministratorRequestTransformer.transform(updated);
}
