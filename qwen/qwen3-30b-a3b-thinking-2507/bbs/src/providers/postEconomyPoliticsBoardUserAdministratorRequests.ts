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
import { EconomyPoliticsBoardAdministratorRequestCollector } from "../collectors/EconomyPoliticsBoardAdministratorRequestCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomyPoliticsBoardAdministratorRequestTransformer } from "../transformers/EconomyPoliticsBoardAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomyPoliticsBoardUserAdministratorRequests(props: {
  user: UserPayload;
  body: IEconomyPoliticsBoardAdministratorRequest.ICreate;
}): Promise<IEconomyPoliticsBoardAdministratorRequest> {
  const existing =
    await MyGlobal.prisma.economy_politics_board_administrator_requests.findFirst(
      {
        where: {
          users_id: props.user.id,
          status: "pending",
          deleted_at: null,
        },
      },
    );
  if (existing) {
    throw new HttpException("Duplicate pending administrator request", 409);
  }
  const user = await MyGlobal.prisma.economy_politics_board_users.findUnique({
    where: { id: props.user.id },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  const created =
    await MyGlobal.prisma.economy_politics_board_administrator_requests.create({
      data: await EconomyPoliticsBoardAdministratorRequestCollector.collect({
        body: props.body,
        economyPoliticsBoardUsers: {
          id: user.id,
          type: "user",
        },
      }),
    });
  return await EconomyPoliticsBoardAdministratorRequestTransformer.transform(
    created,
  );
}
