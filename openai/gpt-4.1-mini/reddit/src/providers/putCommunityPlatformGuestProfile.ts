import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformUserTransformer } from "../transformers/CommunityPlatformUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformGuestProfile(props: {
  guest: GuestPayload;
  body: ICommunityPlatformUser.IUpdate;
}): Promise<ICommunityPlatformUser> {
  const updatedUser = await MyGlobal.prisma.community_platform_users.update({
    where: { id: props.guest.id },
    data: {
      ...(props.body.displayName !== undefined && {
        display_name: props.body.displayName,
      }),
      bio: props.body.bio === undefined ? undefined : props.body.bio,
      avatar_url:
        props.body.avatarUrl === undefined ? undefined : props.body.avatarUrl,
    },
    ...CommunityPlatformUserTransformer.select(),
  });
  return await CommunityPlatformUserTransformer.transform(updatedUser);
}
