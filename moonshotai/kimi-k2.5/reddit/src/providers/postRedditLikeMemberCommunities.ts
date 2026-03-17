import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunityCollector } from "../collectors/RedditLikeCommunityCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeCommunityTransformer } from "../transformers/RedditLikeCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberCommunities(props: {
  member: AdminPayload;
  body: IRedditLikeCommunity.ICreate;
}): Promise<IRedditLikeCommunity> {
  // Validate name uniqueness (case-insensitive)
  const existing = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      name: {
        equals: props.body.name,
        mode: "insensitive",
      },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Community with this name already exists", 409);
  }
  // Validate icon attachment exists if provided
  if (props.body.iconAttachmentId) {
    const attachment = await MyGlobal.prisma.reddit_like_attachments.findUnique(
      {
        where: { id: props.body.iconAttachmentId },
        select: { id: true },
      },
    );
    if (!attachment) {
      throw new HttpException("Icon attachment not found", 404);
    }
  }
  // Create community using collector
  const created = await MyGlobal.prisma.reddit_like_communities.create({
    data: await RedditLikeCommunityCollector.collect({
      body: props.body,
      redditLikeMembers: { id: props.member.id },
      redditLikeMemberSessions: { id: props.member.session_id },
    }),
    ...RedditLikeCommunityTransformer.select(),
  });
  return await RedditLikeCommunityTransformer.transform(created);
}
