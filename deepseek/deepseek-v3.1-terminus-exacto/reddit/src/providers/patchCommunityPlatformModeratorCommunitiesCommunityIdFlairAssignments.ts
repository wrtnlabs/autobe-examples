import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityFlairAssignment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityFlairAssignmentAtFlairAssignmentSummaryTransformer } from "../transformers/CommunityPlatformCommunityFlairAssignmentAtFlairAssignmentSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommunitiesCommunityIdFlairAssignments(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityFlairAssignment.IRequest;
}): Promise<IPageICommunityPlatformCommunityFlairAssignment.IFlairAssignmentSummary> {
  // First, verify the moderator has permissions for this community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
        is_active: true,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!moderatorAssignment) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Build where clause based on filter criteria
  const whereInput = {
    community: { id: props.communityId },
    deleted_at: null,
    ...(props.body.user_id && { user: { id: props.body.user_id } }),
    ...(props.body.flair_id && { flair: { id: props.body.flair_id } }),
    ...(props.body.expired_at !== undefined && props.body.expired_at === null
      ? { expired_at: null }
      : props.body.expired_at !== undefined && props.body.expired_at !== null
        ? { expired_at: { equals: new Date(props.body.expired_at) } }
        : undefined),
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
  } satisfies Prisma.community_platform_community_flair_assignmentsWhereInput;
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get total count
  const total =
    await MyGlobal.prisma.community_platform_community_flair_assignments.count({
      where: whereInput,
    });
  // Get paginated data
  const data =
    await MyGlobal.prisma.community_platform_community_flair_assignments.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" as const },
        ...CommunityPlatformCommunityFlairAssignmentAtFlairAssignmentSummaryTransformer.select(),
      },
    );
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommunityFlairAssignmentAtFlairAssignmentSummaryTransformer.transform,
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
