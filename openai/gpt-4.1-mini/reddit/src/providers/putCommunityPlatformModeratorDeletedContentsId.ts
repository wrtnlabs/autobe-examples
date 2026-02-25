import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
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
import { CommunityPlatformDeletedContentTransformer } from "../transformers/CommunityPlatformDeletedContentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorDeletedContentsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
  body: ICommunityPlatformDeletedContent.IUpdate;
}): Promise<ICommunityPlatformDeletedContent> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const currentTimestamp: string & tags.Format<"date-time"> =
      new Date().toISOString() as string & tags.Format<"date-time">;
    const updatedRecord = await tx.community_platform_deleted_contents.update({
      where: { id: props.id },
      data: { reason: props.body.reason, updated_at: currentTimestamp },
      ...CommunityPlatformDeletedContentTransformer.select(),
    });
    return await CommunityPlatformDeletedContentTransformer.transform(
      updatedRecord,
    );
  });
}
