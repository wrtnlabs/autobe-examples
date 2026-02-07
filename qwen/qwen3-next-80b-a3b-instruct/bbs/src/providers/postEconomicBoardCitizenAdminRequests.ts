import { IEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardAdminRequestCollector } from "../collectors/EconomicBoardAdminRequestCollector";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicBoardCitizenAdminRequests(props: {
  citizen: CitizenPayload;
  body: IEconomicBoardAdminRequest.ICreate;
}): Promise<IEconomicBoardAdminRequest> {
  const created = await MyGlobal.prisma.economic_board_admin_requests.create({
    data: await EconomicBoardAdminRequestCollector.collect({
      body: props.body,
      economicBoardCitizens: {
        id: props.citizen.id,
      },
    }),
  });
  return created;
}
