import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeOwnerCommunitiesCommunityId(props: {
  owner: OwnerPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
      owner_id: true,
      icon_attachment_id: true,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.owner_id !== props.owner.id) {
    throw new HttpException(
      "Forbidden - only the owner can delete this community",
      403,
    );
  }
  const now = new Date();
  await MyGlobal.prisma.reddit_like_communities.update({
    where: { id: props.communityId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
