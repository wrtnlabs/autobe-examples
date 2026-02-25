import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformUserTransformer } from "../transformers/CommunityPlatformUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserAccount(props: {
  user: UserPayload;
  body: ICommunityPlatformUser.IUpdate;
}): Promise<ICommunityPlatformUser> {
  // Verify user exists and is active
  await MyGlobal.prisma.community_platform_users.findFirstOrThrow({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });
  // Prepare update data
  const updateData: Prisma.community_platform_usersUpdateInput = {};
  // Handle each field with proper type handling
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }
  if (props.body.bio !== undefined) {
    updateData.bio = props.body.bio;
  }
  if (props.body.avatar_url !== undefined) {
    updateData.avatar_url = props.body.avatar_url;
  }
  // Always update the updated_at timestamp
  updateData.updated_at = new Date();
  // Update user profile and return transformed result
  const updatedUser = await MyGlobal.prisma.community_platform_users.update({
    where: { id: props.user.id },
    data: updateData,
    ...CommunityPlatformUserTransformer.select(),
  });
  return await CommunityPlatformUserTransformer.transform(updatedUser);
}
