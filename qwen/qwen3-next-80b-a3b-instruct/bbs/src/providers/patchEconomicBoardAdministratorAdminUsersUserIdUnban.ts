import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EconomicBoardCitizenTransformer } from "../transformers/EconomicBoardCitizenTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardAdministratorAdminUsersUserIdUnban(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardCitizen> {
  const user = await MyGlobal.prisma.economic_board_citizens.findUniqueOrThrow({
    where: { id: props.userId },
  });
  if (!user.is_banned) {
    throw new HttpException("This user is not currently banned.", 400);
  }
  const updated = await MyGlobal.prisma.economic_board_citizens.update({
    where: { id: props.userId },
    data: {
      is_banned: false,
      ban_reason: null,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Re-fetch with the specific fields needed for IEconomicBoardCitizen
  const completeUser =
    await MyGlobal.prisma.economic_board_citizens.findUniqueOrThrow({
      where: { id: props.userId },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        display_name: true,
        bio: true,
        is_banned: true,
        ban_reason: true,
        comments: {
          select: { id: true },
        },
        articles: {
          select: { id: true },
        },
      },
    });
  // Calculate counts manually to match IEconomicBoardCitizen structure
  const _count = {
    comments: completeUser.comments?.length || 0,
    articles: completeUser.articles?.length || 0,
  };
  // Construct the full structure including _count, without the arrays
  const { comments, articles, ...baseUser } = completeUser;
  return EconomicBoardCitizenTransformer.transform({
    ...baseUser,
    _count,
  });
}
