import { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardTagCollector } from "../collectors/EconomicPoliticalDiscussionBoardTagCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalDiscussionBoardTagTransformer } from "../transformers/EconomicPoliticalDiscussionBoardTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalDiscussionBoardAdminTags(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalDiscussionBoardTag.ICreate;
}): Promise<IEconomicPoliticalDiscussionBoardTag> {
  const existing =
    await MyGlobal.prisma.economic_political_discussion_board_tags.findFirst({
      where: {
        name: {
          equals: props.body.name,
          mode: "insensitive",
        },
      },
    });
  if (existing) {
    throw new HttpException("Tag name already exists", 400);
  }
  const data = await EconomicPoliticalDiscussionBoardTagCollector.collect({
    body: props.body,
  });
  const created =
    await MyGlobal.prisma.economic_political_discussion_board_tags.create({
      data,
      ...EconomicPoliticalDiscussionBoardTagTransformer.select(),
    });
  return await EconomicPoliticalDiscussionBoardTagTransformer.transform(
    created,
  );
}
