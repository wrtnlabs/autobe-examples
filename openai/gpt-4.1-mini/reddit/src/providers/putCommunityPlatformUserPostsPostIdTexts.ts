import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostTextTransformer } from "../transformers/CommunityPlatformPostTextTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformUserPostsPostIdTexts(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostText.IUpdate;
}): Promise<ICommunityPlatformPostText> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        post_type: true,
        author_user_id: true,
      },
    },
  );
  if (post.post_type !== "text") {
    throw new HttpException("Post is not a text type", 404);
  }
  if (post.author_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_post_texts.updateMany({
    where: { community_platform_post_id: props.postId },
    data: {
      content: props.body.content,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: { updated_at: now },
  });
  const updatedText =
    await MyGlobal.prisma.community_platform_post_texts.findFirstOrThrow({
      where: { community_platform_post_id: props.postId },
      ...CommunityPlatformPostTextTransformer.select(),
    });
  return CommunityPlatformPostTextTransformer.transform(updatedText);
}
