import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeModeratorRoleTransformer } from "../transformers/RedditLikeModeratorRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberCommunitiesCommunityNameModerators(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditLikeModeratorRole.ICreate;
}): Promise<IRedditLikeModeratorRole> {
  // Step 1: Verify the authenticated member has 'owner' role for the community
  const ownerRole = await MyGlobal.prisma.reddit_like_moderator_roles.findFirst(
    {
      where: {
        user_id: props.member.id,
        community: {
          name: props.communityName,
        },
        role: "owner",
      },
    },
  );
  if (!ownerRole) {
    throw new HttpException("Only community owners can assign moderators", 403);
  }
  // Step 2: Look up the community by name to get community_id
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      name: props.communityName,
    },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Step 3: Check if the target user is already a moderator of the community
  const existingModerator =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: props.body.user_id,
        community_id: community.id,
      },
    });
  if (existingModerator) {
    throw new HttpException(
      "User is already a moderator of this community",
      409,
    );
  }
  // Step 4: Create the ModeratorRole record
  const created = await MyGlobal.prisma.reddit_like_moderator_roles.create({
    data: {
      id: v4(),
      user_id: props.body.user_id,
      community_id: community.id,
      role: "moderator",
      created_at: new Date(),
    },
    ...RedditLikeModeratorRoleTransformer.select(),
  });
  // Step 5: Transform the result using the transformer
  const result = await RedditLikeModeratorRoleTransformer.transform(created);
  // Ensure role field is properly typed
  return {
    ...result,
    role: typia.assert<"owner" | "moderator">(result.role),
  };
}
