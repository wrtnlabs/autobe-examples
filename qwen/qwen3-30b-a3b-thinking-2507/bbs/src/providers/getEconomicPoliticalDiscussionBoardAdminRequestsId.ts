import { IEconomicPoliticalDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdminRequest";
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
import { EconomicPoliticalDiscussionBoardAdminRequestTransformer } from "../transformers/EconomicPoliticalDiscussionBoardAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalDiscussionBoardAdminRequestsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalDiscussionBoardAdminRequest> {
  const request =
    await MyGlobal.prisma.economic_political_discussion_board_admin_requests.findUniqueOrThrow(
      {
        where: {
          id: props.id,
          deleted_at: null,
        },
        ...EconomicPoliticalDiscussionBoardAdminRequestTransformer.select(),
      },
    );
  return await EconomicPoliticalDiscussionBoardAdminRequestTransformer.transform(
    request,
  );
}
