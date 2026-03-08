import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMembers(props: {
  body: IRedditPlatformMember.IRequest;
}): Promise<IPageIRedditPlatformMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const search = props.body.search;
  const email = props.body.email;
  const sort_by = props.body.sort_by ?? "created_at";
  const sort_order = props.body.sort_order ?? "desc";
  const whereInput = {
    deleted_at: null,
    ...(search && {
      OR: [
        { username: { contains: search } },
        { display_name: { contains: search } },
      ],
    }),
    ...(email && { email: { contains: email } }),
  } satisfies Prisma.reddit_platform_membersWhereInput;
  const orderByInput = {
    [sort_by]: sort_order,
  } satisfies Prisma.reddit_platform_membersOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_members.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditPlatformMemberAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_members.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await Promise.all(
      data.map(RedditPlatformMemberAtSummaryTransformer.transform),
    ),
  } satisfies IPageIRedditPlatformMember.ISummary;
}
