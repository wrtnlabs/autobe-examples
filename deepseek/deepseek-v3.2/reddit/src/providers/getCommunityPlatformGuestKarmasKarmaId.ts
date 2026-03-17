import { ICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarma";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformKarmaTransformer } from "../transformers/CommunityPlatformKarmaTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformGuestKarmasKarmaId(props: {
  guest: GuestPayload;
  karmaId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformKarma> {
  // Fetch the karma record by ID, ensuring it's not soft-deleted
  const karma =
    await MyGlobal.prisma.community_platform_karmas.findUniqueOrThrow({
      where: {
        id: props.karmaId,
        deleted_at: null, // Only return active records
      },
      ...CommunityPlatformKarmaTransformer.select(),
    });
  // Transform Prisma result to DTO
  return await CommunityPlatformKarmaTransformer.transform(karma);
}
