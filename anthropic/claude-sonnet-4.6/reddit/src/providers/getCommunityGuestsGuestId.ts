import { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityGuestTransformer } from "../transformers/CommunityGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<ICommunityGuest> {
  const record = await MyGlobal.prisma.community_guests.findUniqueOrThrow({
    where: { id: props.guestId },
    ...CommunityGuestTransformer.select(),
  });
  return await CommunityGuestTransformer.transform(record);
}
