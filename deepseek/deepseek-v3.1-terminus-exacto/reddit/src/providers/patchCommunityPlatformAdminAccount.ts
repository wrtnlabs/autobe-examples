import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformUserTransformer } from "../transformers/CommunityPlatformUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminAccount(props: {
  admin: AdminPayload;
  body: ICommunityPlatformUser.IUpdate;
}): Promise<ICommunityPlatformUser> {
  // Verify admin exists and is active
  await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
    where: { id: props.admin.id, deleted_at: null, is_active: true },
  });
  // Build update data handling optional fields and null values correctly
  const updateData: Prisma.community_platform_usersUpdateInput = {
    ...(props.body.display_name !== undefined && {
      display_name: props.body.display_name,
    }),
    ...(props.body.bio !== undefined && { bio: props.body.bio }),
    ...(props.body.avatar_url !== undefined && {
      avatar_url: props.body.avatar_url,
    }),
    updated_at: new Date().toISOString(),
  };
  // Update the user record
  const updatedUser = await MyGlobal.prisma.community_platform_users.update({
    where: { id: props.admin.id },
    data: updateData,
    ...CommunityPlatformUserTransformer.select(),
  });
  // Transform and return response
  return await CommunityPlatformUserTransformer.transform(updatedUser);
}
