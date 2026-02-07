import { IEconomicBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardCitizenProfileStats(props: {
  citizen: CitizenPayload;
}): Promise<IEconomicBoardProfile> {
  const articleCount = await MyGlobal.prisma.economic_board_articles.count({
    where: {
      economic_board_citizen_id: props.citizen.id,
      deleted_at: null,
    },
  });
  const commentCount = await MyGlobal.prisma.economic_board_comments.count({
    where: {
      economic_board_users_id: props.citizen.id,
      deleted_at: null,
    },
  });
  const engagementScore = articleCount + commentCount;
  return {
    articleCount,
    commentCount,
    engagementScore,
  };
}
