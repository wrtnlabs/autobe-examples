import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformMemberTransformer } from "../transformers/RedditPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformMemberProfile(props: {
  member: MemberPayload;
  body: IRedditPlatformMember.IUpdate;
}): Promise<IRedditPlatformMember> {
  const existingMember =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: {
        id: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!existingMember.is_active) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.display_name !== undefined) {
    const trimmed = props.body.display_name.trim();
    if (trimmed.length === 0) {
      throw new HttpException("Bad Request", 400);
    }
    const duplicate = await MyGlobal.prisma.reddit_platform_members.findFirst({
      where: {
        display_name: props.body.display_name,
        id: {
          not: props.member.id,
        },
      },
    });
    if (duplicate !== null) {
      throw new HttpException("Bad Request", 400);
    }
  }
  if (props.body.bio !== undefined && props.body.bio !== null) {
    const trimmed = props.body.bio.trim();
    if (trimmed.length === 0) {
      throw new HttpException("Bad Request", 400);
    }
  }
  if (props.body.avatar_url !== undefined && props.body.avatar_url !== null) {
    try {
      new URL(props.body.avatar_url);
    } catch {
      throw new HttpException("Bad Request", 400);
    }
  }
  const updateData: {
    display_name?: string;
    bio?: string | null;
    avatar_url?: (string & tags.Format<"uri">) | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }
  if (props.body.bio !== undefined) {
    updateData.bio = props.body.bio;
  }
  if (props.body.avatar_url !== undefined) {
    updateData.avatar_url = props.body.avatar_url;
  }
  await MyGlobal.prisma.reddit_platform_members.update({
    where: { id: props.member.id },
    data: updateData,
  });
  const updatedMember =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...RedditPlatformMemberTransformer.select(),
    });
  return await RedditPlatformMemberTransformer.transform(updatedMember);
}
