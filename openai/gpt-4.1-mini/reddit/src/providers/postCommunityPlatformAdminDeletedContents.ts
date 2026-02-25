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
import { CommunityPlatformDeletedContentCollector } from "../collectors/CommunityPlatformDeletedContentCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformDeletedContentTransformer } from "../transformers/CommunityPlatformDeletedContentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminDeletedContents(props: {
  admin: AdminPayload;
  body: ICommunityPlatformDeletedContent.ICreate;
}): Promise<ICommunityPlatformDeletedContent> {
  if (
    (props.body.post_id == null && props.body.comment_id == null) ||
    (props.body.post_id != null && props.body.comment_id != null)
  ) {
    throw new HttpException(
      "Exactly one of post_id or comment_id must be provided",
      400,
    );
  }
  const data = await CommunityPlatformDeletedContentCollector.collect({
    body: props.body,
  });
  const created =
    await MyGlobal.prisma.community_platform_deleted_contents.create({
      data,
      ...CommunityPlatformDeletedContentTransformer.select(),
    });
  return await CommunityPlatformDeletedContentTransformer.transform(created);
}
