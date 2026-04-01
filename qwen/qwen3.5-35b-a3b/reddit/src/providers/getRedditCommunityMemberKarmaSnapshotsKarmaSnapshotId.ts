import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityKarmaSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaSnapshot";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityKarmaSnapshotAtSummaryTransformer } from "../transformers/RedditCommunityKarmaSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberKarmaSnapshotsKarmaSnapshotId(props: {
  member: MemberPayload;
  karmaSnapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityKarmaSnapshot.ISummary> {
  const snapshot =
    await MyGlobal.prisma.reddit_community_karma_snapshots.findUniqueOrThrow({
      where: {
        id: props.karmaSnapshotId,
        deleted_at: null,
      },
      select: RedditCommunityKarmaSnapshotAtSummaryTransformer.select().select,
    });
  return await RedditCommunityKarmaSnapshotAtSummaryTransformer.transform(
    snapshot,
  );
}
