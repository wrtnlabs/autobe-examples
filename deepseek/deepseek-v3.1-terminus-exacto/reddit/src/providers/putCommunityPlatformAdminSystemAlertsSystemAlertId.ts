import { ICommunityPlatformSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemAlert";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSystemAlertTransformer } from "../transformers/CommunityPlatformSystemAlertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminSystemAlertsSystemAlertId(props: {
  admin: AdminPayload;
  systemAlertId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSystemAlert.IUpdate;
}): Promise<ICommunityPlatformSystemAlert> {
  // Verify the alert exists and get current state
  const existingAlert =
    await MyGlobal.prisma.community_platform_system_alerts.findUniqueOrThrow({
      where: { id: props.systemAlertId },
    });
  // Validate status transitions
  if (props.body.status !== undefined) {
    const validTransitions: Record<string, string[]> = {
      new: ["acknowledged", "investigating"],
      acknowledged: ["investigating", "resolved"],
      investigating: ["resolved"],
      resolved: [],
    };
    if (!validTransitions[existingAlert.status]?.includes(props.body.status)) {
      throw new HttpException(
        `Invalid status transition from ${existingAlert.status} to ${props.body.status}`,
        400,
      );
    }
  }
  // Prepare update data with ISO string timestamps
  const currentTime = new Date().toISOString();
  const updateData: Prisma.community_platform_system_alertsUpdateInput = {
    updated_at: currentTime,
  };
  // Handle status transitions with automatic timestamp management
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
    // Automatic timestamp management based on status transitions
    if (
      props.body.status === "acknowledged" &&
      existingAlert.status === "new"
    ) {
      updateData.acknowledged_at = currentTime;
    } else if (
      props.body.status === "resolved" &&
      existingAlert.status !== "resolved"
    ) {
      updateData.resolved_at = currentTime;
    }
  }
  // Handle other update fields with proper null/undefined handling
  if (props.body.resolution_notes !== undefined) {
    updateData.resolution_notes = props.body.resolution_notes;
  }
  if (props.body.acknowledged_at !== undefined) {
    updateData.acknowledged_at = props.body.acknowledged_at;
  }
  if (props.body.resolved_at !== undefined) {
    updateData.resolved_at = props.body.resolved_at;
  }
  // Perform the update with optimistic locking
  try {
    const updatedAlert =
      await MyGlobal.prisma.community_platform_system_alerts.update({
        where: {
          id: props.systemAlertId,
          // Optional: Add updated_at check for optimistic locking
          // updated_at: existingAlert.updated_at
        },
        data: updateData,
        ...CommunityPlatformSystemAlertTransformer.select(),
      });
    return await CommunityPlatformSystemAlertTransformer.transform(
      updatedAlert,
    );
  } catch (error) {
    // Handle concurrent update conflicts
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException(
        "Alert was modified by another administrator. Please refresh and try again.",
        409,
      );
    }
    throw error;
  }
}
