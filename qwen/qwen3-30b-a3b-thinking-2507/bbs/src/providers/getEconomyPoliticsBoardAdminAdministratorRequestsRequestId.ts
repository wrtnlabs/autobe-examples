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

export async function getEconomyPoliticsBoardAdminAdministratorRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEconomyPoliticsBoardAdministratorRequest> {
  const request =
    await MyGlobal.prisma.economy_politics_board_administrator_requests.findUnique(
      {
        where: { id: props.requestId, deleted_at: null },
        ...EconomyPoliticsBoardAdministratorRequestTransformer.select(),
      },
    );
  if (!request) throw new HttpException("Request not found", 404);
  return await EconomyPoliticsBoardAdministratorRequestTransformer.transform(
    request,
  );
}
