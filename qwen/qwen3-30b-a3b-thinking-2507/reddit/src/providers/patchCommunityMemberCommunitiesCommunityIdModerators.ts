import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityModeratorAtSummaryTransformer } from "../transformers/CommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityModerator.IRequest;
}): Promise<IPageICommunityModerator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_moderators.findMany({
    where: { community_id: props.communityId, deleted_at: null },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityModeratorAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_moderators.count({
    where: { community_id: props.communityId, deleted_at: null },
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityModeratorAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } as IPage.IPagination,
  };
}
