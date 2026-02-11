import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityMemberAtSummaryTransformer } from "../transformers/CommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminMembers(props: {
  admin: AdminPayload;
  body: ICommunityMember.IRequest;
}): Promise<IPageICommunityMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.community_membersWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { display_name: { contains: props.body.search, mode: "insensitive" } },
        { email: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.community_membersWhereInput;
  const data = await MyGlobal.prisma.community_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    ...CommunityMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_members.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityMemberAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } as IPageICommunityMember.ISummary;
}
