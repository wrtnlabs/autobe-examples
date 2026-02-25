import { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalDiscussionBoardAdminTransformer } from "../transformers/EconomicPoliticalDiscussionBoardAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalDiscussionBoardAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string;
}): Promise<IEconomicPoliticalDiscussionBoardAdmin> {
  const admin =
    await MyGlobal.prisma.economic_political_discussion_board_admins.findUniqueOrThrow(
      {
        where: { id: props.adminId, deleted_at: null },
        ...EconomicPoliticalDiscussionBoardAdminTransformer.select(),
      },
    );
  return await EconomicPoliticalDiscussionBoardAdminTransformer.transform(
    admin,
  );
}
