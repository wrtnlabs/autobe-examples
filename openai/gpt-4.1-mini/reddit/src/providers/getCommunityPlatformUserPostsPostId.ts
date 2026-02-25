import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommunityAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformCommunityModeratorTransformer } from "../transformers/CommunityPlatformCommunityModeratorTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "../transformers/CommunityPlatformUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserPostsPostId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPost> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_id: true,
        author_user_id: true,
        author_moderator_id: true,
        title: true,
        post_type: true,
        authorUser: CommunityPlatformUserAtSummaryTransformer.select(),
        authorModerator:
          CommunityPlatformCommunityModeratorTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        post_votes: { select: { vote: true } },
        post_comments: { select: { id: true } },
        post_texts: { select: { content: true } },
        post_images: { select: { url: true } },
        post_link: {
          select: { url: true, link_title: true, link_description: true },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  const voteCount = post.post_votes.reduce(
    (
      sum: number,
      v: {
        vote?: number | null;
      },
    ) => sum + (v.vote ?? 0),
    0,
  );
  const commentCount = post.post_comments.length;
  const authorUser = post.authorUser
    ? await CommunityPlatformUserAtSummaryTransformer.transform(post.authorUser)
    : null;
  const authorModerator = post.authorModerator
    ? await CommunityPlatformCommunityModeratorTransformer.transform(
        post.authorModerator,
      )
    : null;
  const community = post.community
    ? await CommunityPlatformCommunityAtSummaryTransformer.transform(
        post.community,
      )
    : null;
  const result: ICommunityPlatformPost & {
    content?: string;
    images?: string[];
    linkUrl?: string;
    linkTitle?: string;
    linkDescription?: string;
  } = {
    id: post.id,
    communityId: post.community_id,
    authorUserId: post.author_user_id ?? undefined,
    authorModeratorId: post.author_moderator_id ?? undefined,
    title: post.title,
    postType: typia.assert<"text" | "link" | "image">(post.post_type),
    authorUser,
    authorModerator,
    community: community!,
    voteCount: voteCount satisfies number as number & tags.Type<"int32">,
    commentCount: commentCount satisfies number as number & tags.Type<"int32">,
    createdAt: toISOStringSafe(post.created_at),
    updatedAt: toISOStringSafe(post.updated_at),
    deletedAt: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
  };
  if (post.post_type === "text") {
    result.content = post.post_texts[0]?.content ?? "";
  } else if (post.post_type === "image") {
    result.images = await ArrayUtil.asyncMap(
      post.post_images ?? [],
      async (img: { url: string }) => img.url,
    );
  } else if (post.post_type === "link") {
    const link = post.post_link;
    if (link) {
      result.linkUrl = link.url ?? "";
      result.linkTitle = link.link_title ?? "";
      result.linkDescription = link.link_description ?? "";
    } else {
      result.linkUrl = "";
      result.linkTitle = "";
      result.linkDescription = "";
    }
  }
  return result;
}
