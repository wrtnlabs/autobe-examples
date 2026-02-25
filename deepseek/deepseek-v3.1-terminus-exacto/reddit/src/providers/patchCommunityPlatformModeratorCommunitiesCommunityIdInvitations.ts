import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityInvitation";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityInvitationAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityInvitationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommunitiesCommunityIdInvitations(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityInvitation.IRequest;
}): Promise<IPageICommunityPlatformCommunityInvitation.ISummary> {
  // Verify moderator has permission to view invitations for this community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
        deleted_at: null,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "You don't have permission to view invitations for this community",
      403,
    );
  }
  // Build WHERE clause with filters
  const whereInput = {
    community_platform_community_id: props.communityId,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.inviter_id && { inviter_id: props.body.inviter_id }),
    ...(props.body.invitee_id && { invitee_id: props.body.invitee_id }),
    ...(props.body.message && { message: { contains: props.body.message } }),
  } satisfies Prisma.community_platform_community_invitationsWhereInput;
  // Add date range filters if both start and end are provided
  if (props.body.created_at_start && props.body.created_at_end) {
    (whereInput as any).created_at = {
      gte: new Date(props.body.created_at_start),
      lte: new Date(props.body.created_at_end),
    };
  }
  if (props.body.expires_at_start && props.body.expires_at_end) {
    (whereInput as any).expires_at = {
      gte: new Date(props.body.expires_at_start),
      lte: new Date(props.body.expires_at_end),
    };
  }
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get paginated data
  const data =
    await MyGlobal.prisma.community_platform_community_invitations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformCommunityInvitationAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.community_platform_community_invitations.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommunityInvitationAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
