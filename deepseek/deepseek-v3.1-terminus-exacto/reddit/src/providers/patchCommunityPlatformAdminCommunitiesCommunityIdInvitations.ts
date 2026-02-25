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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityInvitationAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityInvitationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdInvitations(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityInvitation.IRequest;
}): Promise<IPageICommunityPlatformCommunityInvitation.ISummary> {
  // Verify community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereInput: Prisma.community_platform_community_invitationsWhereInput =
    {
      community_platform_community_id: props.communityId,
      ...(props.body.status !== undefined &&
        props.body.status !== null && { status: props.body.status }),
      ...(props.body.inviter_id !== undefined && {
        inviter_id: props.body.inviter_id,
      }),
      ...(props.body.invitee_id !== undefined && {
        invitee_id: props.body.invitee_id,
      }),
      ...(props.body.message !== undefined &&
        props.body.message !== null && {
          message: { contains: props.body.message },
        }),
      ...(props.body.created_at_start !== undefined && {
        created_at: { gte: toISOStringSafe(props.body.created_at_start) },
      }),
      ...(props.body.created_at_end !== undefined && {
        created_at: { lte: toISOStringSafe(props.body.created_at_end) },
      }),
      ...(props.body.expires_at_start !== undefined && {
        expires_at: { gte: toISOStringSafe(props.body.expires_at_start) },
      }),
      ...(props.body.expires_at_end !== undefined && {
        expires_at: { lte: toISOStringSafe(props.body.expires_at_end) },
      }),
    };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_invitations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformCommunityInvitationAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_community_invitations.count({
      where: whereInput,
    }),
  ]);
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
