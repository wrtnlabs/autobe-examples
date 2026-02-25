import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdminTransformer } from "../transformers/DiscussionBoardAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminAdminsProfile(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdmin.IUpdate;
}): Promise<IDiscussionBoardAdmin> {
  // Verify the admin exists and is active
  const existingAdmin =
    await MyGlobal.prisma.discussion_board_admins.findFirstOrThrow({
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
    });
  // Validate email uniqueness if email is being changed
  if (
    props.body.email !== undefined &&
    props.body.email !== existingAdmin.email
  ) {
    const duplicateAdmin =
      await MyGlobal.prisma.discussion_board_admins.findUnique({
        where: {
          email: props.body.email,
          deleted_at: null,
        },
      });
    if (duplicateAdmin !== null) {
      throw new HttpException(
        "Email address is already registered by another administrator",
        400,
      );
    }
  }
  // Build update data object with proper typing
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };
  // Only include fields that are actually being updated
  if (props.body.email !== undefined) {
    updateData.email = props.body.email;
  }
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }
  // Perform the update
  const updatedAdmin = await MyGlobal.prisma.discussion_board_admins.update({
    where: { id: props.admin.id },
    data: updateData,
    ...DiscussionBoardAdminTransformer.select(),
  });
  // Return transformed response
  return DiscussionBoardAdminTransformer.transform(updatedAdmin);
}
