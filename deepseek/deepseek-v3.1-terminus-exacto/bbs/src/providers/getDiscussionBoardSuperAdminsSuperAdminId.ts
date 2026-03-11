import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSuperAdminTransformer } from "../transformers/DiscussionBoardSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminsSuperAdminId(props: {
  superAdminId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSuperAdmin> {
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findUniqueOrThrow({
      where: { id: props.superAdminId },
      ...DiscussionBoardSuperAdminTransformer.select(),
    });
  return await DiscussionBoardSuperAdminTransformer.transform(superAdmin);
}
