import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
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
import { CommunityPlatformSystemNotificationTransformer } from "../transformers/CommunityPlatformSystemNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminSystemNotificationsSystemNotificationId(props: {
  admin: AdminPayload;
  systemNotificationId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSystemNotification> {
  const notification =
    await MyGlobal.prisma.community_platform_system_notifications.findUniqueOrThrow(
      {
        where: { id: props.systemNotificationId },
        ...CommunityPlatformSystemNotificationTransformer.select(),
      },
    );
  return await CommunityPlatformSystemNotificationTransformer.transform(
    notification,
  );
}
