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
import { RedditCloneModeratorSnapshotTransformer } from "../transformers/RedditCloneModeratorSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneCommunitiesCommunityNameModeratorsModeratorId(props: {
  communityName: string;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneModeratorSnapshot> {
  // Step 1: Verify community exists by name
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: { id: true },
    });
  // Step 2: Query moderator with matching id AND community, ensure not soft-deleted
  const moderator =
    await MyGlobal.prisma.reddit_clone_moderators.findUniqueOrThrow({
      where: {
        id: props.moderatorId,
        reddit_clone_community_id: community.id,
        deleted_at: null,
      },
      ...RedditCloneModeratorSnapshotTransformer.select(),
    });
  // Step 3: Transform and return
  return await RedditCloneModeratorSnapshotTransformer.transform(moderator);
}
