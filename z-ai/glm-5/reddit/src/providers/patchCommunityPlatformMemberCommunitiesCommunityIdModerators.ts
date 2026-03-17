import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModeratorAtSummaryTransformer } from "../transformers/CommunityPlatformModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerator.IRequest;
}): Promise<IPageICommunityPlatformModerator.ISummary> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    community_platform_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.role !== undefined && props.body.role !== null
      ? { role: props.body.role }
      : {}),
  } satisfies Prisma.community_platform_moderatorsWhereInput;
  const orderByInput = (
    props.body.sort === "username"
      ? { member: { username: "asc" as const } }
      : { created_at: "desc" as const }
  ) satisfies Prisma.community_platform_moderatorsOrderByWithRelationInput;
  const moderators =
    await MyGlobal.prisma.community_platform_moderators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformModeratorAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.community_platform_moderators.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      moderators,
      CommunityPlatformModeratorAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
