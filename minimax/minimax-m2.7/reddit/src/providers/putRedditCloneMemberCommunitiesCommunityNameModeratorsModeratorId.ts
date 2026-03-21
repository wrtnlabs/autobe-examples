import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneModeratorSnapshotTransformer } from "../transformers/RedditCloneModeratorSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberCommunitiesCommunityNameModeratorsModeratorId(props: {
  member: MemberPayload;
  communityName: string;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditCloneModeratorSnapshot.IUpdate;
}): Promise<IRedditCloneModeratorSnapshot> {
  // 1. Look up community by name
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: {
        id: true,
        name: true,
        reddit_clone_member_id: true,
      },
    });
  // 2. Verify authenticated user is the owner of the community
  if (community.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Look up moderator by moderatorId
  const moderator =
    await MyGlobal.prisma.reddit_clone_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
      select: {
        id: true,
        role: true,
        reddit_clone_community_id: true,
      },
    });
  // 4. Verify moderator belongs to the specified community
  if (moderator.reddit_clone_community_id !== community.id) {
    throw new HttpException("Moderator does not belong to this community", 404);
  }
  // 5. Validate the role value - only 'moderator' allowed for updates
  // Owner role is immutable once set during community creation
  if (props.body.role !== "moderator") {
    throw new HttpException(
      "Invalid role value. Only 'moderator' is allowed for updates",
      400,
    );
  }
  // 6. Update the moderator role and set updated_at
  await MyGlobal.prisma.reddit_clone_moderators.update({
    where: { id: props.moderatorId },
    data: {
      role: props.body.role,
      updated_at: new Date(),
    },
  });
  // 7. Return the updated moderator record with all relations using transformer
  const updated =
    await MyGlobal.prisma.reddit_clone_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
      ...RedditCloneModeratorSnapshotTransformer.select(),
    });
  return await RedditCloneModeratorSnapshotTransformer.transform(updated);
}
