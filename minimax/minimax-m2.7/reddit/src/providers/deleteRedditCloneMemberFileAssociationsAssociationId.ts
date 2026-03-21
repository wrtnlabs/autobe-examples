import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneMemberFileAssociationsAssociationId(props: {
  member: MemberPayload;
  associationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const association =
    await MyGlobal.prisma.reddit_clone_file_associations.findUniqueOrThrow({
      where: { id: props.associationId },
      select: {
        id: true,
        target_type: true,
        target_id: true,
      },
    });
  if (association.target_type === "user") {
    if (association.target_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
  } else if (association.target_type === "post") {
    const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: { id: association.target_id },
      select: { reddit_clone_member_id: true },
    });
    if (post.reddit_clone_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
  } else if (association.target_type === "community") {
    const moderator =
      await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
        where: {
          reddit_clone_community_id: association.target_id,
          reddit_clone_member_id: props.member.id,
          role: { in: ["owner", "moderator"] },
        },
      });
    if (!moderator) {
      throw new HttpException("Forbidden", 403);
    }
  } else {
    throw new HttpException("Invalid target type", 400);
  }
  await MyGlobal.prisma.reddit_clone_file_associations.delete({
    where: { id: props.associationId },
  });
}
