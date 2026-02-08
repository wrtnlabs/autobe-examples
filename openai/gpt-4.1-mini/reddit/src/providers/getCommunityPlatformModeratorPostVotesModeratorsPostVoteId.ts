import { ICommunityPlatformPostVoteOfModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerators";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformModeratorPostVotesModeratorsPostVoteId(props: {
  moderator: ModeratorPayload;
  postVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVoteOfModerators> {
  const record =
    await MyGlobal.prisma.community_platform_post_vote_of_moderators.findUnique(
      {
        where: { id: props.postVoteId },
      },
    );
  if (!record || record.deleted_at !== null) {
    throw new HttpException("Post vote not found", 404);
  }
  return record;
}
