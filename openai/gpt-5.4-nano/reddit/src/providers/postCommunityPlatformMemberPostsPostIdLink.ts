import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostLinkCollector } from "../collectors/CommunityPlatformPostLinkCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdLink(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostLink.ICreate;
}): Promise<ICommunityPlatformPost> {
  if (props.body.href.length === 0) {
    throw new HttpException("href is required", 400);
  }
  const now: string = new Date().toISOString();
  const nowIso: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(now);
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const post = await tx.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        deleted_at: true,
        post_type: true,
        author_id: true,
        link_url: true,
        edited_by_id: true,
        edited_at: true,
        updated_at: true,
        created_at: true,
        posted_at: true,
        title: true,
        body: true,
        postImages: { select: { id: true } },
        snapshots: { select: { id: true } },
        linkMetadatum: { select: { id: true } },
        comments: { select: { deleted_at: true } },
        postVotes: { select: { vote_value: true, deleted_at: true } },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_href: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            owner: {
              select: {
                id: true,
                userProfile: {
                  select: {
                    display_name: true,
                    bio: true,
                    avatar_uri: true,
                  },
                },
              },
            },
            communitySubscriptions: {
              select: { is_active: true, deleted_at: true },
            },
          },
        },
        author: {
          select: {
            id: true,
            userProfile: {
              select: {
                display_name: true,
                bio: true,
                avatar_uri: true,
              },
            },
          },
        },
        editedBy: {
          select: {
            id: true,
            userProfile: {
              select: {
                display_name: true,
                bio: true,
                avatar_uri: true,
              },
            },
          },
        },
        deletedBy: {
          select: {
            id: true,
            userProfile: {
              select: {
                display_name: true,
                bio: true,
                avatar_uri: true,
              },
            },
          },
        },
        image_alt_text: true,
        image_cover_url: true,
      },
    });
    if (post.deleted_at !== null) {
      throw new HttpException("Forbidden", 403);
    }
    if (post.author_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    const linkUrl = props.body.href;
    const linkRow = await tx.community_platform_post_links.findUnique({
      where: { community_platform_post_id: props.postId },
      select: {
        id: true,
        href: true,
        display_title: true,
        display_description: true,
        deleted_at: true,
      },
    });
    if (linkRow === null) {
      await tx.community_platform_post_links.create({
        data: await CommunityPlatformPostLinkCollector.collect({
          body: props.body,
          communityPlatformPosts: post as unknown as IEntity,
        }),
      });
    } else {
      await tx.community_platform_post_links.update({
        where: { community_platform_post_id: props.postId },
        data: {
          href: linkUrl,
          display_title: props.body.displayTitle ?? linkRow.display_title,
          display_description:
            props.body.displayDescription ?? linkRow.display_description,
          updated_at: nowIso,
          deleted_at: null,
        },
      });
    }
    await tx.community_platform_posts.update({
      where: { id: props.postId },
      data: {
        post_type: "link",
        link_url: linkUrl,
        edited_by_id: props.member.id,
        edited_at: nowIso,
        updated_at: nowIso,
      },
    });
    const refreshed = await tx.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...CommunityPlatformPostTransformer.select(),
    });
    return await CommunityPlatformPostTransformer.transform(refreshed);
  });
}
