import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPostTransformer } from "../transformers/CommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPost.IUpdate;
}): Promise<ICommunityPost> {
  // Step 1: Load the post, ensuring it exists and is not soft-deleted
  const post = await MyGlobal.prisma.community_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_member_id: true,
      type: true,
    },
  });
  // Step 2: Authorization — only the original author may update
  if (post.community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Perform mutations in a single transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update parent post record
    await tx.community_posts.update({
      where: { id: props.postId },
      data: {
        ...(props.body.title !== undefined && { title: props.body.title }),
        updated_at: new Date(),
      },
    });
    // Update type-specific child table based on post type
    if (post.type === "text" && props.body.body !== undefined) {
      await tx.community_post_texts.update({
        where: { community_post_id: props.postId },
        data: { body: props.body.body },
      });
    } else if (post.type === "link" && props.body.url !== undefined) {
      const domain = new URL(props.body.url).hostname;
      await tx.community_post_links.update({
        where: { community_post_id: props.postId },
        data: {
          url: props.body.url,
          domain,
        },
      });
    } else if (post.type === "image") {
      const hasImageUpdate =
        props.body.image_url !== undefined ||
        props.body.thumbnail_url !== undefined;
      if (hasImageUpdate) {
        await tx.community_post_images.update({
          where: { community_post_id: props.postId },
          data: {
            ...(props.body.image_url !== undefined && {
              image_url: props.body.image_url,
            }),
            ...(props.body.thumbnail_url !== undefined && {
              thumbnail_url: props.body.thumbnail_url,
            }),
          },
        });
      }
    }
  });
  // Step 4: Fetch and return the fully assembled post detail
  const updated = await MyGlobal.prisma.community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    ...CommunityPostTransformer.select(),
  });
  return await CommunityPostTransformer.transform(updated);
}
