import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityBannedUserCollector } from "../collectors/CommunityBannedUserCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityBannedUserTransformer } from "../transformers/CommunityBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityModeratorBans(props: {
  moderator: ModeratorPayload;
  body: ICommunityBannedUser.ICreate;
}): Promise<ICommunityBannedUser> {
  const created = await MyGlobal.prisma.community_bans.create({
    data: await CommunityBannedUserCollector.collect({
      body: props.body,
      community: { id: (props.body as any).community_id },
      bannedUser: { id: (props.body as any).banned_user_id },
      communityAdmins: { id: props.moderator.id },
      communityModerators: { id: props.moderator.id },
      reason: (props.body as any).reason,
    }),
    ...CommunityBannedUserTransformer.select(),
  });
  return await CommunityBannedUserTransformer.transform(created);
}
