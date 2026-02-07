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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdmins(props: {
  body: ICommunityAdmin.IRequest;
}): Promise<IPageICommunityAdmin.ISummary> {
  // Since IRequest is empty {}, we return all non-soft-deleted admins without filtering or pagination
  const data = await MyGlobal.prisma.community_admins.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      display_name: true,
      email_verified: true,
      created_at: true,
      updated_at: true,
      avatar_url: true,
      bio: true,
    },
  });
  const total = await MyGlobal.prisma.community_admins.count({
    where: { deleted_at: null },
  });
  // Convert to summary format with proper type annotations
  const summaryData = data.map((admin) => ({
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email as string,
    display_name: admin.display_name as string,
    email_verified: admin.email_verified as boolean,
    created_at: toISOStringSafe(admin.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(admin.updated_at) as string &
      tags.Format<"date-time">,
    avatar_url: admin.avatar_url as string | null,
    bio: admin.bio as string | null,
  }));
  return {
    data: summaryData,
    pagination: {
      current: 1,
      limit: total,
      records: total,
      pages: 1,
    } satisfies IPage.IPagination,
  };
}
