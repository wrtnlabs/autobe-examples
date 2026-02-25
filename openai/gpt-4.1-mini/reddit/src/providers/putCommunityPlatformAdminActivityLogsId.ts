import { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformActivityLogTransformer } from "../transformers/CommunityPlatformActivityLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminActivityLogsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: ICommunityPlatformActivityLog.IUpdate;
}): Promise<ICommunityPlatformActivityLog> {
  // Retrieve existing activity log to ensure it exists
  await MyGlobal.prisma.community_platform_activity_logs.findUniqueOrThrow({
    where: { id: props.id },
  });
  // Prepare the update data with only allowed modifiable fields
  const updateData: {
    action_type?: string | undefined;
    ip_address?: string | null | undefined;
    user_agent?: string | null | undefined;
    metadata?: string | null | undefined;
  } = {};
  if (props.body.actionType !== undefined)
    updateData.action_type = props.body.actionType;
  if (props.body.ipAddress !== undefined)
    updateData.ip_address = props.body.ipAddress;
  if (props.body.userAgent !== undefined)
    updateData.user_agent = props.body.userAgent;
  if (props.body.metadata !== undefined)
    updateData.metadata = props.body.metadata;
  // Perform update
  const updatedRecord =
    await MyGlobal.prisma.community_platform_activity_logs.update({
      where: { id: props.id },
      data: updateData,
      ...CommunityPlatformActivityLogTransformer.select(),
    });
  // Return transformed updated record
  return await CommunityPlatformActivityLogTransformer.transform(updatedRecord);
}
