import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformAdministratorApprovalRequestTransformer } from "../transformers/MallPlatformAdministratorApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformAdministratorAdministratorApprovalRequestsAdministratorApprovalRequestId(props: {
  administrator: AdministratorPayload;
  administratorApprovalRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformAdministratorApprovalRequest.IUpdate;
}): Promise<IMallPlatformAdministratorApprovalRequest> {
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException(
      "Invalid administrator approval request status",
      400,
    );
  }
  if (
    props.body.status === "rejected" &&
    props.body.rejectionReason === undefined
  ) {
    throw new HttpException("Rejection reason is required when rejecting", 400);
  }
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    const reviewer = await prisma.mall_platform_administrators.findUnique({
      where: { id: props.administrator.id },
      select: { id: true },
    });
    if (reviewer === null) {
      throw new HttpException("Administrator account not found", 401);
    }
    const current =
      await prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
        {
          where: { id: props.administratorApprovalRequestId },
          select: {
            id: true,
            administrator_id: true,
            status: true,
          },
        },
      );
    if (current.status !== "pending") {
      throw new HttpException(
        "Administrator approval request is not pending",
        409,
      );
    }
    await prisma.mall_platform_administrator_approval_requests.update({
      where: { id: props.administratorApprovalRequestId },
      data: {
        status: props.body.status,
        reviewer_administrator_id: props.administrator.id,
        reviewed_at: new Date(),
        updated_at: new Date(),
        rejection_reason:
          props.body.status === "rejected"
            ? (props.body.rejectionReason ?? null)
            : null,
      },
    });
    if (props.body.status === "approved") {
      await prisma.mall_platform_administrators.update({
        where: { id: current.administrator_id },
        data: {
          grade: "regular",
          updated_at: new Date(),
        },
      });
    }
    return await prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.administratorApprovalRequestId },
        ...MallPlatformAdministratorApprovalRequestTransformer.select(),
      },
    );
  });
  return await MallPlatformAdministratorApprovalRequestTransformer.transform(
    result,
  );
}
