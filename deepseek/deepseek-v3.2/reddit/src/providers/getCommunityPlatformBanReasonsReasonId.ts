import { ICommunityPlatformBanReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformBanReasonTransformer } from "../transformers/CommunityPlatformBanReasonTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformBanReasonsReasonId(props: {
  reasonId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformBanReason> {
  const banReason =
    await MyGlobal.prisma.community_platform_ban_reasons.findUniqueOrThrow({
      where: {
        id: props.reasonId,
        deleted_at: null,
      },
      ...CommunityPlatformBanReasonTransformer.select(),
    });
  return await CommunityPlatformBanReasonTransformer.transform(banReason);
}
