import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileAssociation";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneFileAssociationAtSummaryTransformer } from "../transformers/RedditCloneFileAssociationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneFileAssociations(props: {
  body: IRedditCloneFileAssociation.IRequest;
}): Promise<IPageIRedditCloneFileAssociation.ISummary> {
  const { body } = props;
  // Pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build dynamic where clause based on provided filters
  const whereInput = {
    ...(body.targetType !== undefined && { target_type: body.targetType }),
    ...(body.targetId !== undefined && { target_id: body.targetId }),
    ...(body.redditCloneFileId !== undefined && {
      reddit_clone_file_id: body.redditCloneFileId,
    }),
  } satisfies Prisma.reddit_clone_file_associationsWhereInput;
  // Fetch paginated file associations
  const data = await MyGlobal.prisma.reddit_clone_file_associations.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCloneFileAssociationAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_clone_file_associations.count({
    where: whereInput,
  });
  // Transform results using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCloneFileAssociationAtSummaryTransformer.transform,
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
