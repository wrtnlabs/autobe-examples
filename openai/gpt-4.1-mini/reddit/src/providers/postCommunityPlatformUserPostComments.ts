import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { CommunityPlatformPostCommentCollector } from "../collectors/CommunityPlatformPostCommentCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostCommentTransformer } from "../transformers/CommunityPlatformPostCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserPostComments(props: {
  user: UserPayload;
  body: ICommunityPlatformPostComment.ICreate;
}): Promise<ICommunityPlatformPostComment> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.body.post_id },
  });
  const data = await CommunityPlatformPostCommentCollector.collect({
    body: props.body,
    user: props.user,
  });
  const created = await MyGlobal.prisma.community_platform_post_comments.create(
    {
      data,
      ...CommunityPlatformPostCommentTransformer.select(),
    },
  );
  return await CommunityPlatformPostCommentTransformer.transform(created);
}
