import { IEconomyPoliticsBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdministratorRequest";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomyPoliticsBoardAdministratorRequestTransformer } from "../transformers/EconomyPoliticsBoardAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomyPoliticsBoardAdminAdministratorRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEconomyPoliticsBoardAdministratorRequest.IUpdate;
}): Promise<IEconomyPoliticsBoardAdministratorRequest> {
  // Find the administrator request by ID
  const request =
    await MyGlobal.prisma.economy_politics_board_administrator_requests.findUnique(
      {
        where: { id: props.requestId },
      },
    );
  if (!request) {
    throw new HttpException("Administrator request not found", 404);
  }
  // Update the status and reason
  await MyGlobal.prisma.economy_politics_board_administrator_requests.update({
    where: { id: props.requestId },
    data: {
      status: props.body.status,
      reason: props.body.reason,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Fetch the updated request with the requestor relation
  const updatedRequest =
    await MyGlobal.prisma.economy_politics_board_administrator_requests.findUnique(
      {
        where: { id: props.requestId },
        ...EconomyPoliticsBoardAdministratorRequestTransformer.select(),
      },
    );
  if (!updatedRequest) {
    throw new HttpException("Administrator request not found", 404);
  }
  // Transform and return the updated request
  return await EconomyPoliticsBoardAdministratorRequestTransformer.transform(
    updatedRequest,
  );
}
