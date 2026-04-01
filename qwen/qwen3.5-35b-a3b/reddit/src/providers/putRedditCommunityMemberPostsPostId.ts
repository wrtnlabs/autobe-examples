import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostTransformer } from "../transformers/RedditCommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IUpdate;
}): Promise<IRedditCommunityPost> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      post_type: true,
      author_id: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const titleUpdate =
    props.body.title !== undefined ? { title: props.body.title } : {};
  await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: {
      ...titleUpdate,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  switch (post.post_type) {
    case "text":
      if (props.body.text_post_body !== undefined) {
        await MyGlobal.prisma.reddit_community_post_texts.upsert({
          where: { id: props.postId },
          update: { body: props.body.text_post_body },
          create: {
            id: props.postId,
            body: props.body.text_post_body,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            post: { connect: { id: props.postId } },
          },
        });
      }
      break;
    case "link":
      if (props.body.link_post_url !== undefined) {
        const domainName = extractDomainName(props.body.link_post_url);
        await MyGlobal.prisma.reddit_community_post_links.upsert({
          where: { id: props.postId },
          update: {
            url: props.body.link_post_url,
            domain_name: domainName,
          },
          create: {
            id: props.postId,
            url: props.body.link_post_url,
            domain_name: domainName,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            post: { connect: { id: props.postId } },
          },
        });
      }
      break;
    case "image":
      if (props.body.image_id !== undefined) {
        await MyGlobal.prisma.reddit_community_file_of_posts.upsert({
          where: { id: props.postId },
          update: { file: { connect: { id: props.body.image_id } } },
          create: {
            id: props.postId,
            file: { connect: { id: props.body.image_id } },
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            post: { connect: { id: props.postId } },
          },
        });
      }
      break;
  }
  const updated =
    await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        title: true,
        post_type: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        text: {
          select: {
            id: true,
            body: true,
          },
        } satisfies Prisma.reddit_community_post_textsFindManyArgs,
        link: {
          select: {
            id: true,
            url: true,
            domain_name: true,
          },
        } satisfies Prisma.reddit_community_post_linksFindManyArgs,
        images: {
          select: {
            file: {
              select: {
                file_path: true,
              },
            } satisfies Prisma.reddit_community_filesFindManyArgs,
          },
        } satisfies Prisma.reddit_community_file_of_postsFindManyArgs,
      },
    });
  return await RedditCommunityPostTransformer.transform(updated);
}
function extractDomainName(uri: string & tags.Format<"uri">): string {
  try {
    const url = new URL(uri);
    return url.hostname;
  } catch {
    return "";
  }
}
