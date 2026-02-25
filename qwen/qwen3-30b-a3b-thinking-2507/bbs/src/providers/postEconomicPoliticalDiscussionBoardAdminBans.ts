import { IEconomicPoliticalDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardBan";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardBanCollector } from "../collectors/EconomicPoliticalDiscussionBoardBanCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalDiscussionBoardBanTransformer } from "../transformers/EconomicPoliticalDiscussionBoardBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalDiscussionBoardAdminBans(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalDiscussionBoardBan.ICreate;
}): Promise<IEconomicPoliticalDiscussionBoardBan> {
  const created =
    await MyGlobal.prisma.economic_political_discussion_board_bans.create({
      data: await EconomicPoliticalDiscussionBoardBanCollector.collect({
        body: props.body,
        economicPoliticalDiscussionBoardUsers: {
          id: props.admin.id,
        },
      }),
      ...EconomicPoliticalDiscussionBoardBanTransformer.select(),
    });
  return await EconomicPoliticalDiscussionBoardBanTransformer.transform(
    created,
  );
}
