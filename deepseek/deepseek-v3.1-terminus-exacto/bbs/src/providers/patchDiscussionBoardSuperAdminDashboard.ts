import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSuperAdminTransformer } from "../transformers/DiscussionBoardSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardSuperAdminDashboard(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSuperAdmin.IRequest;
}): Promise<IDiscussionBoardSuperAdmin> {
  // Get the current super admin's information
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findUnique({
      where: {
        id: props.superAdmin.id,
        deleted_at: null,
      },
      ...DiscussionBoardSuperAdminTransformer.select(),
    });
  if (!superAdmin) {
    throw new HttpException("Super administrator not found", 404);
  }
  // Transform the super admin data
  return await DiscussionBoardSuperAdminTransformer.transform(superAdmin);
}
