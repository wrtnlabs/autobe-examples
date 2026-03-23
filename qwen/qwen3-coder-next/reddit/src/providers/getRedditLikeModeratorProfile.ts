import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeModeratorProfile(props: {
  moderator: ModeratorPayload;
}): Promise<IRedditLikeMember.ISummary> {
  const member = await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
    where: { id: props.moderator.id },
    select: {
      id: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      created_at: true,
    },
  });
  return {
    id: member.id,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio ?? undefined,
    avatar_url: member.avatar_url ?? undefined,
    karma_score: member.karma_score,
    created_at: member.created_at.toISOString(),
  };
}
