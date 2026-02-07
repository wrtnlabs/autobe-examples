import { ICommunityPlatformVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteSnapshot";
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

export async function getCommunityPlatformMemberVotesVoteIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVoteSnapshot> {
  const snapshot =
    await MyGlobal.prisma.community_platform_vote_snapshots.findUnique({
      where: {
        id: props.snapshotId,
        community_platform_vote_id: props.voteId,
      },
      include: {
        vote: {
          select: {
            id: true,
            vote_type: true,
            user_id: true,
            created_at: true,
          },
        },
      },
    });
  if (!snapshot) {
    throw new HttpException("Snapshot not found", 404);
  }
  return {
    id: snapshot.id,
    vote_id: snapshot.community_platform_vote_id,
    before_vote_type: snapshot.before_vote_type,
    after_vote_type: snapshot.after_vote_type,
    created_at: toISOStringSafe(snapshot.created_at),
    updated_at: toISOStringSafe(snapshot.updated_at),
    deleted_at: snapshot.deleted_at
      ? toISOStringSafe(snapshot.deleted_at)
      : null,
    vote: {
      id: snapshot.vote.id,
      vote_type: snapshot.vote.vote_type,
      user_id: snapshot.vote.user_id,
      created_at: toISOStringSafe(snapshot.vote.created_at),
    },
  };
}
