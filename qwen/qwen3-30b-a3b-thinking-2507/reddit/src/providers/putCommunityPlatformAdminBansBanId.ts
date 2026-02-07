import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationBanTransformer } from "../transformers/CommunityPlatformModerationBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationBan.IUpdate;
}): Promise<ICommunityPlatformModerationBan> {
  const ban =
    await MyGlobal.prisma.community_platform_moderation_bans.findUnique({
      where: { id: props.banId },
      ...CommunityPlatformModerationBanTransformer.select(),
    });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  const updatedBan =
    await MyGlobal.prisma.community_platform_moderation_bans.update({
      where: { id: props.banId },
      data: {
        reason: props.body.reason,
        duration: props.body.duration,
        ends_at: props.body.ends_at === null ? null : props.body.ends_at,
        updated_at: toISOStringSafe(new Date()),
      },
      ...CommunityPlatformModerationBanTransformer.select(),
    });
  return await CommunityPlatformModerationBanTransformer.transform(updatedBan);
}
