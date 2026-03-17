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
import { CommunityModeratorAtSummaryTransformer } from "../transformers/CommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityCommunitiesCommunityIdModerators(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityModerator.IRequest;
}): Promise<IPageICommunityModerator.ISummary> {
  // Validate the community exists and is not deleted
  await MyGlobal.prisma.community_communities.findFirstOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    community_id: props.communityId,
    ...(props.body.role != null && { role: props.body.role }),
    ...(props.body.search != null && {
      member: {
        username: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
    }),
  } satisfies Prisma.community_moderatorsWhereInput;
  const data = await MyGlobal.prisma.community_moderators.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "asc" },
    ...CommunityModeratorAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_moderators.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      CommunityModeratorAtSummaryTransformer.transform,
    ),
  };
}
