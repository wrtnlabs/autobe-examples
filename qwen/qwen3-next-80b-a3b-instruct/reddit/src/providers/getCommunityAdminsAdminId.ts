import { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminsAdminId(props: {
  adminId: string & tags.Format<"uuid">;
}): Promise<ICommunityAdmin> {
  const admin = await MyGlobal.prisma.community_admins.findUnique({
    where: { id: props.adminId, deleted_at: null },
  });
  if (!admin) throw new HttpException("Admin not found", 404);
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email,
    display_name: admin.display_name,
    bio: admin.bio === null ? undefined : admin.bio,
    avatar_url: admin.avatar_url === null ? undefined : admin.avatar_url,
    created_at: toISOStringSafe(admin.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(admin.updated_at) as string &
      tags.Format<"date-time">,
  };
}
