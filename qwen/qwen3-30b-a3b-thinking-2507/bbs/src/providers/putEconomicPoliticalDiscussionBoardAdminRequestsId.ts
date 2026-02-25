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

export async function putEconomicPoliticalDiscussionBoardAdminRequestsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IEconomicPoliticalDiscussionBoardAdminRequest.IUpdate;
}): Promise<IEconomicPoliticalDiscussionBoardAdminRequest> {
  const { id, body } = props;
  if (!body.status) {
    throw new HttpException("Status must be provided", 400);
  }
  if (body.status !== "approved" && body.status !== "rejected") {
    throw new HttpException("Invalid status value", 400);
  }
  const currentRequest =
    await MyGlobal.prisma.economic_political_discussion_board_admin_requests.findUniqueOrThrow(
      {
        where: { id },
        ...EconomicPoliticalDiscussionBoardAdminRequestTransformer.select(),
      },
    );
  if (currentRequest.status !== "pending") {
    throw new HttpException("Request must be pending to update", 400);
  }
  await MyGlobal.prisma.economic_political_discussion_board_admin_requests.update(
    {
      where: { id },
      data: {
        status: body.status,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  const updatedRequest =
    await MyGlobal.prisma.economic_political_discussion_board_admin_requests.findUniqueOrThrow(
      {
        where: { id },
        ...EconomicPoliticalDiscussionBoardAdminRequestTransformer.select(),
      },
    );
  return await EconomicPoliticalDiscussionBoardAdminRequestTransformer.transform(
    updatedRequest,
  );
}
