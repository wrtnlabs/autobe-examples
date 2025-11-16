import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminCommunitiesCommunityName(props: {
  admin: AdminPayload;
  communityName: string;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { community_name: props.communityName } satisfies {
        community_name: string;
      } as any,
    });

  if (!community) {
    throw new HttpException(`Community not found: ${props.communityName}`, 404);
  }

  await MyGlobal.prisma.reddit_community_communities.delete({
    where: { community_name: props.communityName } satisfies {
      community_name: string;
    } as any,
  });
}
