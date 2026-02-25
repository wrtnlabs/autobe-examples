import { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformErrorLogTransformer } from "../transformers/CommunityPlatformErrorLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminErrorLogsErrorLogId(props: {
  admin: AdminPayload;
  errorLogId: string & tags.Format<"uuid">;
  body: ICommunityPlatformErrorLog.IUpdate;
}): Promise<ICommunityPlatformErrorLog> {
  // Verify error log exists
  const existing =
    await MyGlobal.prisma.community_platform_error_logs.findUniqueOrThrow({
      where: { id: props.errorLogId },
    });
  // Validate resolution_status if provided
  const validStatuses = ["open", "investigating", "resolved", "ignored"];
  if (
    props.body.resolution_status !== undefined &&
    !validStatuses.includes(props.body.resolution_status)
  ) {
    throw new HttpException(
      `Invalid resolution_status. Must be one of: ${validStatuses.join(", ")}`,
      400,
    );
  }
  // Prepare update data with proper null handling
  const updateData: Prisma.community_platform_error_logsUpdateInput = {
    updated_at: new Date(),
  };
  // Handle resolution_status
  if (props.body.resolution_status !== undefined) {
    updateData.resolution_status = props.body.resolution_status;
    // Auto-set resolved_at if status changes to 'resolved' and no explicit resolved_at provided
    if (
      props.body.resolution_status === "resolved" &&
      props.body.resolved_at === undefined
    ) {
      updateData.resolved_at = new Date();
    }
  }
  // Handle resolution_notes (explicit null allowed)
  if (props.body.resolution_notes !== undefined) {
    updateData.resolution_notes = props.body.resolution_notes;
  }
  // Handle resolved_at (explicit null allowed)
  if (props.body.resolved_at !== undefined) {
    updateData.resolved_at = props.body.resolved_at
      ? new Date(props.body.resolved_at)
      : null;
  }
  // Execute update
  const updated = await MyGlobal.prisma.community_platform_error_logs.update({
    where: { id: props.errorLogId },
    data: updateData,
    ...CommunityPlatformErrorLogTransformer.select(),
  });
  return await CommunityPlatformErrorLogTransformer.transform(updated);
}
