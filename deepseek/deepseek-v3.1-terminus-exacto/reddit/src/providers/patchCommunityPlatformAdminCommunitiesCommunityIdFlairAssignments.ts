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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityFlairAssignmentAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityFlairAssignmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdFlairAssignments(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityFlairAssignment.IRequest;
}): Promise<IPageICommunityPlatformCommunityFlairAssignment.ISummary> {
  // Verify community exists and admin has access
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
  });
  // Build WHERE clause from filter criteria
  const whereInput: Prisma.community_platform_community_flair_assignmentsWhereInput =
    {
      community: { id: props.communityId, deleted_at: null },
      deleted_at: null,
    };
  // Apply user_id filter
  if (props.body.user_id !== undefined) {
    whereInput.user = { id: props.body.user_id, deleted_at: null };
  }
  // Apply flair_id filter
  if (props.body.flair_id !== undefined) {
    whereInput.flair = { id: props.body.flair_id, deleted_at: null };
  }
  // Apply expired_at filter
  if (props.body.expired_at !== undefined) {
    if (props.body.expired_at === null) {
      whereInput.expired_at = null; // Active assignments
    } else {
      whereInput.expired_at = { equals: new Date(props.body.expired_at) };
    }
  }
  // Apply date range filters
  if (
    props.body.created_at_start !== undefined ||
    props.body.created_at_end !== undefined
  ) {
    whereInput.created_at = {};
    if (props.body.created_at_start !== undefined) {
      whereInput.created_at.gte = new Date(props.body.created_at_start);
    }
    if (props.body.created_at_end !== undefined) {
      whereInput.created_at.lte = new Date(props.body.created_at_end);
    }
  }
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query data with pagination
  const data =
    await MyGlobal.prisma.community_platform_community_flair_assignments.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...CommunityPlatformCommunityFlairAssignmentAtSummaryTransformer.select(),
      },
    );
  // Count total records
  const total =
    await MyGlobal.prisma.community_platform_community_flair_assignments.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommunityFlairAssignmentAtSummaryTransformer.transform,
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
