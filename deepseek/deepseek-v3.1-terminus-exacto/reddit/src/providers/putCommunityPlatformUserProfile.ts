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

export async function putCommunityPlatformUserProfile(props: {
  user: UserPayload;
  body: ICommunityPlatformUser.IUpdate;
}): Promise<ICommunityPlatformUser> {
  // Validate request body fields
  if (
    props.body.display_name !== undefined &&
    props.body.display_name !== null
  ) {
    if (
      props.body.display_name.length < 2 ||
      props.body.display_name.length > 50
    ) {
      throw new HttpException(
        "Display name must be between 2 and 50 characters",
        400,
      );
    }
  }
  if (props.body.bio !== undefined && props.body.bio !== null) {
    if (props.body.bio.length > 500) {
      throw new HttpException("Bio must be 500 characters or less", 400);
    }
  }
  if (props.body.avatar_url !== undefined && props.body.avatar_url !== null) {
    try {
      typia.assert<tags.Format<"uri">>(props.body.avatar_url);
    } catch {
      throw new HttpException("Avatar URL must be a valid URL", 400);
    }
  }
  // Build update data object
  const updateData: Prisma.community_platform_usersUpdateInput = {
    updated_at: new Date().toISOString(),
  };
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }
  if (props.body.bio !== undefined) {
    updateData.bio = props.body.bio;
  }
  if (props.body.avatar_url !== undefined) {
    updateData.avatar_url = props.body.avatar_url;
  }
  try {
    // Update user profile
    const updatedUser = await MyGlobal.prisma.community_platform_users.update({
      where: { id: props.user.id },
      data: updateData,
      ...CommunityPlatformUserTransformer.select(),
    });
    return await CommunityPlatformUserTransformer.transform(updatedUser);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new HttpException("User not found", 404);
      }
    }
    throw new HttpException("Failed to update profile", 500);
  }
}
