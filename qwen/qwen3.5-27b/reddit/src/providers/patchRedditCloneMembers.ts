import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMember";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneMemberAtSummaryTransformer } from "../transformers/RedditCloneMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMembers(props: {
  body: IRedditCloneMember.IRequest;
}): Promise<IPageIRedditCloneMember.ISummary> {
  const body = props.body;
  // Parse pagination parameters
  const page = body.page ?? 1;
  const pageSize = body.page_size ?? body.limit ?? 20;
  const skip = (page - 1) * pageSize;
  // Build WHERE clause
  const whereInput: Prisma.reddit_clone_membersWhereInput = {
    deleted_at: null,
  };
  // Search term - combined search on username and display_name
  const searchCondition: Prisma.reddit_clone_membersWhereInput | undefined =
    body.search !== undefined && body.search !== null
      ? {
          OR: [
            { username: { contains: body.search, mode: "insensitive" } },
            { display_name: { contains: body.search, mode: "insensitive" } },
          ],
        }
      : undefined;
  // Individual filters
  const usernameCondition: Prisma.reddit_clone_membersWhereInput | undefined =
    body.username !== undefined && body.username !== null
      ? { username: { contains: body.username, mode: "insensitive" } }
      : undefined;
  const displayNameCondition:
    | Prisma.reddit_clone_membersWhereInput
    | undefined =
    body.display_name !== undefined && body.display_name !== null
      ? { display_name: { contains: body.display_name, mode: "insensitive" } }
      : undefined;
  const emailCondition: Prisma.reddit_clone_membersWhereInput | undefined =
    body.email !== undefined && body.email !== null
      ? { email: { contains: body.email, mode: "insensitive" } }
      : undefined;
  const karmaMinCondition: Prisma.reddit_clone_membersWhereInput | undefined =
    body.karma_min !== undefined && body.karma_min !== null
      ? { karma: { gte: body.karma_min } }
      : undefined;
  const karmaMaxCondition: Prisma.reddit_clone_membersWhereInput | undefined =
    body.karma_max !== undefined && body.karma_max !== null
      ? { karma: { lte: body.karma_max } }
      : undefined;
  const createdAfterCondition:
    | Prisma.reddit_clone_membersWhereInput
    | undefined =
    body.created_after !== undefined && body.created_after !== null
      ? { created_at: { gte: new Date(body.created_after) } }
      : undefined;
  const createdBeforeCondition:
    | Prisma.reddit_clone_membersWhereInput
    | undefined =
    body.created_before !== undefined && body.created_before !== null
      ? { created_at: { lte: new Date(body.created_before) } }
      : undefined;
  // Combine all conditions with AND
  const andConditions: Prisma.reddit_clone_membersWhereInput[] = [
    searchCondition,
    usernameCondition,
    displayNameCondition,
    emailCondition,
    karmaMinCondition,
    karmaMaxCondition,
    createdAfterCondition,
    createdBeforeCondition,
  ].filter(
    (condition): condition is Prisma.reddit_clone_membersWhereInput =>
      condition !== undefined,
  );
  if (andConditions.length > 0) {
    whereInput.AND = andConditions;
  }
  // Build ORDER BY clause
  const sortField = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";
  const orderByInput: Prisma.reddit_clone_membersOrderByWithRelationInput = {
    [sortField]: sortOrder,
  };
  // Query members
  const data = await MyGlobal.prisma.reddit_clone_members.findMany({
    where: whereInput,
    skip,
    take: pageSize,
    orderBy: orderByInput,
    ...RedditCloneMemberAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_clone_members.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCloneMemberAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: transformedData,
  };
}
