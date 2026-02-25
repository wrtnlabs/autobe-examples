import { ICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMaintenanceWindow";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformMaintenanceWindowTransformer } from "../transformers/CommunityPlatformMaintenanceWindowTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminMaintenanceWindowsMaintenanceWindowId(props: {
  admin: AdminPayload;
  maintenanceWindowId: string & tags.Format<"uuid">;
  body: ICommunityPlatformMaintenanceWindow.IUpdate;
}): Promise<ICommunityPlatformMaintenanceWindow> {
  // Verify maintenance window exists and is not deleted
  const existingWindow =
    await MyGlobal.prisma.community_platform_maintenance_windows.findFirst({
      where: {
        id: props.maintenanceWindowId,
        deleted_at: null,
      },
    });
  if (!existingWindow) {
    throw new HttpException("Maintenance window not found", 404);
  }
  // Validate logical constraints for scheduled times
  if (props.body.scheduled_start && props.body.scheduled_end) {
    if (props.body.scheduled_end <= props.body.scheduled_start) {
      throw new HttpException(
        "Scheduled end time must be after scheduled start time",
        400,
      );
    }
  } else if (props.body.scheduled_start && !props.body.scheduled_end) {
    if (
      existingWindow.scheduled_end.toISOString() <= props.body.scheduled_start
    ) {
      throw new HttpException(
        "Scheduled end time must be after scheduled start time",
        400,
      );
    }
  } else if (!props.body.scheduled_start && props.body.scheduled_end) {
    if (
      props.body.scheduled_end <= existingWindow.scheduled_start.toISOString()
    ) {
      throw new HttpException(
        "Scheduled end time must be after scheduled start time",
        400,
      );
    }
  }
  // Build update data with only provided fields
  const updateData: Prisma.community_platform_maintenance_windowsUpdateInput = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.maintenance_type !== undefined && {
      maintenance_type: props.body.maintenance_type,
    }),
    ...(props.body.scheduled_start !== undefined && {
      scheduled_start: new Date(props.body.scheduled_start),
    }),
    ...(props.body.scheduled_end !== undefined && {
      scheduled_end: new Date(props.body.scheduled_end),
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.notification_message !== undefined && {
      notification_message: props.body.notification_message,
    }),
    ...(props.body.impact_level !== undefined && {
      impact_level: props.body.impact_level,
    }),
    ...(props.body.affected_services !== undefined && {
      affected_services: props.body.affected_services,
    }),
    updated_at: new Date(),
  };
  // Update the maintenance window
  await MyGlobal.prisma.community_platform_maintenance_windows.update({
    where: { id: props.maintenanceWindowId },
    data: updateData,
  });
  // Fetch the updated record with transformer
  const updatedWindow =
    await MyGlobal.prisma.community_platform_maintenance_windows.findUniqueOrThrow(
      {
        where: { id: props.maintenanceWindowId },
        ...CommunityPlatformMaintenanceWindowTransformer.select(),
      },
    );
  return await CommunityPlatformMaintenanceWindowTransformer.transform(
    updatedWindow,
  );
}
