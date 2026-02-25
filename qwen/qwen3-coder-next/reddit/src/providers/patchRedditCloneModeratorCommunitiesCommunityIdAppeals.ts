import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationAppeal";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneModerationAppealAtSummaryTransformer } from "../transformers/RedditCloneModerationAppealAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneModeratorCommunitiesCommunityIdAppeals(props: {
  moderator: ModeratorPayload;
  communityId: string;
  body: IRedditCloneModerationAppeal.IRequest;
}): Promise<IPageIRedditCloneModerationAppeal.ISummary> {
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = (props.body.limit ?? 20) satisfies number as number;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_clone_moderation_appealsWhereInput = {
    deleted_at: null,
    report: {
      contentPost: {
        community_id: props.communityId,
      },
    },
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.search && {
      appeal_content: { contains: props.body.search },
    }),
  } satisfies Prisma.reddit_clone_moderation_appealsWhereInput;
  const data = await MyGlobal.prisma.reddit_clone_moderation_appeals.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCloneModerationAppealAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_moderation_appeals.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneModerationAppealAtSummaryTransformer.transform,
    ),
    pagination: {
      current: (page ?? 1) satisfies number as number,
      limit: (limit ?? 20) satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
