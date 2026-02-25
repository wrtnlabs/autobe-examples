import { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformBannedUserTransformer } from "../transformers/CommunityPlatformBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorBannedUsersId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
  body: ICommunityPlatformBannedUser.IUpdate;
}): Promise<ICommunityPlatformBannedUser> {
  // Fetch the banned user record, ensure exists
  const existing =
    await MyGlobal.prisma.community_platform_banned_users.findUniqueOrThrow({
      where: { id: props.id },
    });
  // Prepare updated_at timestamp as ISO string with date-time format
  const updatedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  // Update the banned user record
  await MyGlobal.prisma.community_platform_banned_users.update({
    where: { id: props.id },
    data: {
      reason: props.body.reason,
      unbanned_at: props.body.unbanned_at ?? null,
      updated_at: updatedAt,
    },
  });
  // Fetch the updated record with relations for transform
  const updatedRecord =
    await MyGlobal.prisma.community_platform_banned_users.findUniqueOrThrow({
      where: { id: props.id },
      ...CommunityPlatformBannedUserTransformer.select(),
    });
  return await CommunityPlatformBannedUserTransformer.transform(updatedRecord);
}
