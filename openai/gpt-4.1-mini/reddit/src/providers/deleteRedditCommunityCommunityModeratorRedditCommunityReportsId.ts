import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function deleteRedditCommunityCommunityModeratorRedditCommunityReportsId(props: {
  communityModerator: CommunitymoderatorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const report = await MyGlobal.prisma.reddit_community_reports.findUnique({
    where: { id: props.id },
  });

  if (report === null) {
    throw new HttpException("Content report not found", 404);
  }

  await MyGlobal.prisma.reddit_community_reports.delete({
    where: { id: props.id },
  });
}
