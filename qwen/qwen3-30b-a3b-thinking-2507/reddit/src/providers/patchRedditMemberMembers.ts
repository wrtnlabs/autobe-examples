import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditMember";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditMemberMembers(props: {
  member: MemberPayload;
  body: IRedditMember.IRequest;
}): Promise<IPageIRedditMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      email: {
        contains: props.body.search,
        mode: "insensitive" as "insensitive",
      },
    }),
    ...(props.body.minCreatedAt && {
      created_at: { gte: props.body.minCreatedAt },
    }),
    ...(props.body.maxCreatedAt && {
      created_at: { lte: props.body.maxCreatedAt },
    }),
  };
  const data = await MyGlobal.prisma.reddit_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_members.count({
    where: whereInput,
  });
  const result = {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      email: record.email as string & tags.Format<"email">,
      created_at: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: limit as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
  return result;
}
