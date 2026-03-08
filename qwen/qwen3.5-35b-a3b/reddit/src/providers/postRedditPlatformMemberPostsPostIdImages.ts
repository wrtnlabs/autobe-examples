import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostImageTransformer } from "../transformers/RedditPlatformPostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberPostsPostIdImages(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformPostImage.ICreate;
}): Promise<IRedditPlatformPostImage> {
  const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      post_type: "image",
      reddit_platform_member_id: props.member.id,
      deleted_at: null,
    },
  });
  const id: string & tags.Format<"uuid"> = v4();
  const file_path: string = `uploads/posts/${props.postId}/${props.body.filename}`;
  const created = await MyGlobal.prisma.reddit_platform_post_images.create({
    data: {
      id,
      post: { connect: { id: props.postId } },
      filename: props.body.filename,
      mime_type: props.body.mime_type,
      file_size: props.body.file_size,
      file_path,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...RedditPlatformPostImageTransformer.select(),
  });
  return await RedditPlatformPostImageTransformer.transform(created);
}
