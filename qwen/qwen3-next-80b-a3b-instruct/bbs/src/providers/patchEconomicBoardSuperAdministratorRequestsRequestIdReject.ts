import { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EconomicBoardAdministratorTransformer } from "../transformers/EconomicBoardAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardSuperAdministratorRequestsRequestIdReject(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardAdministrator> {
  const administrator =
    await MyGlobal.prisma.economic_board_administrators.findUniqueOrThrow({
      where: { id: props.requestId },
      ...EconomicBoardAdministratorTransformer.select(),
    });
  if (administrator.admin_request_status !== "pending") {
    throw new HttpException("Not found", 404);
  }
  const updated = await MyGlobal.prisma.economic_board_administrators.update({
    where: { id: props.requestId },
    data: {
      admin_request_status: "rejected",
      updated_at: new Date().toISOString(),
    },
    ...EconomicBoardAdministratorTransformer.select(),
  });
  return EconomicBoardAdministratorTransformer.transform(updated);
}
