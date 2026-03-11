import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityModeratorDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorDetail";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityModeratorDetailTransformer } from "../transformers/RedditPlatformCommunityModeratorDetailTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunityModeratorDetail> {
  // Verify that the authenticated member has moderator status in the target community
  const authCheck =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.member.id,
      },
      select: { id: true },
    });
  if (!authCheck) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the moderator record matching community_id and user_id
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findUniqueOrThrow(
      {
        where: {
          community_id_user_id: {
            community_id: props.communityId,
            user_id: props.moderatorId,
          },
        },
        ...RedditPlatformCommunityModeratorDetailTransformer.select(),
      },
    );
  return await RedditPlatformCommunityModeratorDetailTransformer.transform(
    moderator,
  );
}
