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
import { RedditCommunityPostTransformer } from "../transformers/RedditCommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberPosts(props: {
  member: MemberPayload;
  body: IRedditCommunityPost.ICreate;
}): Promise<IRedditCommunityPost> {
  const { member, body } = props;
  const { community_id, post_type } = body;
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findFirst({
      where: {
        reddit_community_member_id: member.id,
        community: { id: community_id },
        deleted_at: null,
      },
    });
  if (subscription === null) {
    throw new HttpException("Not subscribed to community", 400);
  }
  const postTextValidation =
    post_type === "text" && body.body !== undefined && body.body !== "";
  const linkValidation = post_type === "link" && body.url !== undefined;
  const imageValidation = post_type === "image" && body.fileId !== undefined;
  if (!postTextValidation && !linkValidation && !imageValidation) {
    throw new HttpException("Missing required content for post type", 400);
  }
  if (post_type === "link" && body.url !== undefined) {
    try {
      new URL(body.url);
    } catch {
      throw new HttpException("Invalid URL format", 400);
    }
  }
  if (post_type === "image" && body.fileId !== undefined) {
    const existingUsage =
      await MyGlobal.prisma.reddit_community_file_of_posts.findFirst({
        where: {
          file: { id: body.fileId },
          deleted_at: null,
        },
      });
    if (existingUsage !== null) {
      throw new HttpException("File already used by another post", 409);
    }
    const file = await MyGlobal.prisma.reddit_community_files.findUnique({
      where: { id: body.fileId },
    });
    if (file === null) {
      throw new HttpException("File not found", 404);
    }
  }
  const now = toISOStringSafe(new Date());
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const id: string = v4();
    const createInput: Prisma.reddit_community_postsCreateInput = {
      id,
      title: body.title,
      post_type,
      vote_score: 0,
      comment_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      author: { connect: { id: member.id } },
      community: { connect: { id: community_id } },
    };
    if (post_type === "text") {
      createInput.text = {
        create: {
          id: v4(),
          created_at: now,
          updated_at: now,
          body: body.body!,
        },
      };
    } else if (post_type === "link") {
      const url: string = body.url!;
      const urlObj = new URL(url);
      const domainName: string = urlObj.hostname;
      createInput.link = {
        create: {
          id: v4(),
          created_at: now,
          updated_at: now,
          url,
          domain_name: domainName,
        },
      };
    } else if (post_type === "image") {
      createInput.images = {
        create: {
          id: v4(),
          created_at: now,
          updated_at: now,
          file: { connect: { id: body.fileId! } },
        },
      };
    }
    const post = await tx.reddit_community_posts.create({
      data: createInput,
    });
    return post;
  });
  const fullPost =
    await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
      where: { id: result.id },
      ...RedditCommunityPostTransformer.select(),
    });
  return await RedditCommunityPostTransformer.transform(fullPost);
}
