import { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityAdminAtSummaryTransformer } from "../transformers/CommunityAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminAdmins(props: {
  admin: AdminPayload;
  body: ICommunityAdmin.IRequest;
}): Promise<IPageICommunityAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortDirection = props.body.sortDirection || "desc";
  const sortBy = props.body.sortBy || "created_at";
  let orderByInput: any;
  if (sortBy === "created_at") {
    orderByInput = { created_at: sortDirection as "asc" | "desc" };
  } else if (sortBy === "updated_at") {
    orderByInput = { updated_at: sortDirection as "asc" | "desc" };
  } else if (sortBy === "display_name") {
    orderByInput = { display_name: sortDirection as "asc" | "desc" };
  } else {
    orderByInput = { created_at: "desc" };
  }
  const whereInput = {
    deleted_at: null,
    ...(props.body.email && { email: { contains: props.body.email } }),
    ...(props.body.username && { username: { contains: props.body.username } }),
    ...(props.body.display_name && {
      display_name: { contains: props.body.display_name },
    }),
  };
  const data = await MyGlobal.prisma.community_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_admins.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityAdminAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
