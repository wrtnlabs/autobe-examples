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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityTransformer } from "../transformers/RedditLikeCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunity.IUpdate;
}): Promise<IRedditLikeCommunity> {
  // Fetch community and verify exists and not soft-deleted
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Verify requesting member is the owner
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // If name is being changed, verify uniqueness
  if (props.body.name !== undefined && props.body.name !== community.name) {
    const existingCommunity =
      await MyGlobal.prisma.reddit_like_communities.findFirst({
        where: {
          name: props.body.name,
          deleted_at: null,
        },
      });
    if (existingCommunity !== null) {
      throw new HttpException("Community name already in use", 409);
    }
  }
  // If icon_attachment_id is provided, verify attachment exists
  if (
    props.body.icon_attachment_id !== undefined &&
    props.body.icon_attachment_id !== null
  ) {
    const attachment = await MyGlobal.prisma.reddit_like_attachments.findUnique(
      {
        where: {
          id: props.body.icon_attachment_id,
        },
      },
    );
    if (attachment === null) {
      throw new HttpException("Attachment not found", 400);
    }
  }
  // Update community
  await MyGlobal.prisma.reddit_like_communities.update({
    where: {
      id: props.communityId,
    },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.icon_attachment_id !== undefined && {
        icon_attachment_id: props.body.icon_attachment_id,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch updated community with transformer select
  const updatedCommunity =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
      },
      ...RedditLikeCommunityTransformer.select(),
    });
  return RedditLikeCommunityTransformer.transform(updatedCommunity);
}
