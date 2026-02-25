import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { EconomicBoardCommentTransformer } from "../transformers/EconomicBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardCitizenCommentsCommentId(props: {
  citizen: CitizenPayload;
  commentId: string;
}): Promise<IEconomicBoardComment> {
  const comment =
    await MyGlobal.prisma.economic_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...EconomicBoardCommentTransformer.select(),
    });
  return await EconomicBoardCommentTransformer.transform(comment);
}
