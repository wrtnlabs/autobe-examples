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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformDeletedContentTransformer } from "../transformers/CommunityPlatformDeletedContentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminDeletedContentsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: ICommunityPlatformDeletedContent.IUpdate;
}): Promise<ICommunityPlatformDeletedContent> {
  // Verify existence
  await MyGlobal.prisma.community_platform_deleted_contents.findUniqueOrThrow({
    where: { id: props.id },
  });
  // Update reason and updated_at
  const updated =
    await MyGlobal.prisma.community_platform_deleted_contents.update({
      where: { id: props.id },
      data: {
        reason: props.body.reason,
        updated_at: toISOStringSafe(new Date()),
      },
      ...CommunityPlatformDeletedContentTransformer.select(),
    });
  // Return transformed updated record
  return await CommunityPlatformDeletedContentTransformer.transform(updated);
}
