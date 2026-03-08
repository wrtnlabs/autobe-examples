import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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
  // Validate account status - reject if deleted
  const existingMember =
    await MyGlobal.prisma.reddit_platform_members.findFirst({
      where: {
        id: props.member.id,
        deleted_at: null,
      },
      select: { id: true, is_active: true },
    });
  if (existingMember === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  if (existingMember.is_active === false) {
    throw new HttpException("Account is suspended", 403);
  }
  // Build partial update data with only provided fields
  const updateData: {
    display_name?: string;
    bio?: string | null;
    avatar_url?: string | null;
    updated_at: Date;
  } = { updated_at: new Date() };
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }
  if (props.body.bio !== undefined) {
    updateData.bio = props.body.bio;
  }
  if (props.body.avatar_url !== undefined) {
    updateData.avatar_url = props.body.avatar_url;
  }
  // Apply updates to member record
  await MyGlobal.prisma.reddit_platform_members.update({
    where: { id: props.member.id },
    data: updateData,
  });
  // Query updated member record
  const updated =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...RedditPlatformMemberTransformer.select(),
    });
  // Transform and return
  return await RedditPlatformMemberTransformer.transform(updated);
}
