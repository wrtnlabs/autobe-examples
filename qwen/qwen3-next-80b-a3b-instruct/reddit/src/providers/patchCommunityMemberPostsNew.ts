import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPostCollector } from "../collectors/CommunityPostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPostFeedAtResponseTransformer } from "../transformers/CommunityPostFeedAtResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberPostsNew(props: {
  member: MemberPayload;
  body: ICommunityPost.ICreate;
}): Promise<ICommunityPost> {
  // Load the member entity
  const member = await MyGlobal.prisma.community_members.findUnique({
    where: { id: props.member.id },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  // Use the existing collector to transform the request into Prisma create input
  const collectedData = await CommunityPostCollector.collect({
    body: props.body,
    communityMembers: member,
    communityMemberSessions: member,
  });
  // Use the transformer's select() method to ensure all required relations are fetched
  const created = await MyGlobal.prisma.community_posts.create({
    data: collectedData,
    select: CommunityPostFeedAtResponseTransformer.select().select,
  });
  // Transform the result using the existing transformer
  return await CommunityPostFeedAtResponseTransformer.transform(created);
}
