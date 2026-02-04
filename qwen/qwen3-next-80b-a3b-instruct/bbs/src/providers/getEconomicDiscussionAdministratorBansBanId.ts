import { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EconomicDiscussionBanTransformer } from "../transformers/EconomicDiscussionBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicDiscussionAdministratorBansBanId(props: {
  administrator: AdministratorPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionBan> {
  const ban = await MyGlobal.prisma.economic_discussion_bans.findUnique({
    where: { id: props.banId },
    ...EconomicDiscussionBanTransformer.select(),
  });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  return await EconomicDiscussionBanTransformer.transform(ban);
}
