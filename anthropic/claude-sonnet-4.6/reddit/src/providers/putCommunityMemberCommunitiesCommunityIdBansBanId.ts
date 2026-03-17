import { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityBanTransformer } from "../transformers/CommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: ICommunityBan.IUpdate;
}): Promise<ICommunityBan> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 1: Verify community exists and is not soft-deleted
    await tx.community_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: { id: true },
    });
    // Step 2: Verify requesting member is moderator or owner in this community
    const moderatorRecord = await tx.community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        member_id: props.member.id,
        role: { in: ["moderator", "owner"] },
      },
      select: { id: true },
    });
    if (moderatorRecord === null) {
      throw new HttpException("Forbidden", 403);
    }
    // Step 3: Fetch the ban record scoped to this community
    const banRecord = await tx.community_bans.findFirstOrThrow({
      where: {
        id: props.banId,
        community_id: props.communityId,
      },
      select: {
        id: true,
        status: true,
        banned_member_id: true,
      },
    });
    // Step 4: Check 409 - already lifted and requesting to lift again
    if (banRecord.status === "lifted" && props.body.status === "lifted") {
      throw new HttpException("Ban is already lifted", 409);
    }
    // Step 5: Check 422 - banned member is the community owner
    const ownerRecord = await tx.community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        member_id: banRecord.banned_member_id,
        role: "owner",
      },
      select: { id: true },
    });
    if (ownerRecord !== null) {
      throw new HttpException(
        "Cannot manage ban records for the community owner",
        422,
      );
    }
    // Step 6: Build conditional update data
    const updateData = {
      ...(props.body.status !== undefined && {
        status: props.body.status,
        ...(props.body.status === "lifted" && { lifted_at: new Date() }),
        ...(props.body.status === "active" && { lifted_at: null }),
      }),
      ...(props.body.reason !== undefined && { reason: props.body.reason }),
      updated_at: new Date(),
    } satisfies Prisma.community_bansUpdateInput;
    // Step 7: Perform the update
    await tx.community_bans.update({
      where: { id: props.banId },
      data: updateData,
    });
    // Step 8: Fetch updated record and transform to response DTO
    const updated = await tx.community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...CommunityBanTransformer.select(),
    });
    return await CommunityBanTransformer.transform(updated);
  });
}
