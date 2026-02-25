import { IEconomicPoliticalDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardGuest";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalDiscussionBoardGuestAtBanTransformer } from "../transformers/EconomicPoliticalDiscussionBoardGuestAtBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalDiscussionBoardAdminBansBanId(props: {
  admin: AdminPayload;
  banId: number & tags.Type<"int32">;
}): Promise<IEconomicPoliticalDiscussionBoardGuest.IBan> {
  const ban =
    await MyGlobal.prisma.economic_political_discussion_board_bans.findUniqueOrThrow(
      {
        where: { id: props.banId.toString() },
        ...EconomicPoliticalDiscussionBoardGuestAtBanTransformer.select(),
      },
    );
  return await EconomicPoliticalDiscussionBoardGuestAtBanTransformer.transform(
    ban,
  );
}
