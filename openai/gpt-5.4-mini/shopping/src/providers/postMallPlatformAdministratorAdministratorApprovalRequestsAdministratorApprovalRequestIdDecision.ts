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

export async function postMallPlatformAdministratorAdministratorApprovalRequestsAdministratorApprovalRequestIdDecision(props: {
  administrator: AdministratorPayload;
  administratorApprovalRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformAdministratorApprovalRequest.IDecision;
}): Promise<IMallPlatformAdministratorApprovalRequest> {
  const administrator =
    await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: {
        id: true,
        grade: true,
      },
    });
  if (administrator.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  const request =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.administratorApprovalRequestId },
        select: {
          id: true,
          administrator_id: true,
          reason: true,
          status: true,
          rejection_reason: true,
          reviewed_at: true,
        },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException(
      "Administrator approval request has already been reviewed",
      409,
    );
  }
  if (
    props.body.decision === "reject" &&
    props.body.rejectionReason === undefined
  ) {
    throw new HttpException(
      "rejectionReason is required when decision is reject",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_administrator_approval_requests.update({
      where: { id: props.administratorApprovalRequestId },
      data: {
        reviewer_administrator_id: props.administrator.id,
        status: props.body.decision === "approve" ? "approved" : "rejected",
        rejection_reason:
          props.body.decision === "approve"
            ? null
            : (props.body.rejectionReason ?? null),
        reviewed_at: new Date(),
        updated_at: new Date(),
      },
    });
    await prisma.mall_platform_administrator_approval_request_snapshots.create({
      data: {
        id: v4(),
        administrator_approval_request_id: props.administratorApprovalRequestId,
        snapshot_reason:
          props.body.decision === "approve"
            ? "approved"
            : `rejected: ${props.body.rejectionReason ?? ""}`,
        created_at: new Date(),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.administratorApprovalRequestId },
        ...MallPlatformAdministratorApprovalRequestTransformer.select(),
      },
    );
  return await MallPlatformAdministratorApprovalRequestTransformer.transform(
    updated,
  );
}
