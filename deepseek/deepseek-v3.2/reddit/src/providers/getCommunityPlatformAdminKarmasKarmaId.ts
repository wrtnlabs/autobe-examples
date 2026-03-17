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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformKarmaTransformer } from "../transformers/CommunityPlatformKarmaTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminKarmasKarmaId(props: {
  admin: AdminPayload;
  karmaId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformKarma> {
  const karma =
    await MyGlobal.prisma.community_platform_karmas.findUniqueOrThrow({
      where: {
        id: props.karmaId,
        deleted_at: null,
      },
      ...CommunityPlatformKarmaTransformer.select(),
    });
  return await CommunityPlatformKarmaTransformer.transform(karma);
}
