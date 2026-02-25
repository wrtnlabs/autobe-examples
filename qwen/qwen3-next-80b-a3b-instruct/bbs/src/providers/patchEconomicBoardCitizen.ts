import { IEconomicBoardSystemOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSystemOverview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardSystemOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSystemOverview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardCitizen(props: {
  citizen: CitizenPayload;
  body: IEconomicBoardSystemOverview.IRequest;
}): Promise<IPageIEconomicBoardSystemOverview> {
  return {
    pagination: {
      current: 1,
      limit: 1,
      records: 1,
      pages: 1,
    } satisfies IPage.IPagination,
    data: [
      {
        version: "1.0.0",
        status: "online",
        links: {
          authRegister: "/economicBoard/auth/register",
          authLogin: "/economicBoard/auth/login",
          sections: "/economicBoard/sections",
          articles: "/economicBoard/articles",
          users: "/economicBoard/users",
          adminSections: "/economicBoard/admin/sections",
          adminUsers: "/economicBoard/admin/users",
          adminBannedUsers: "/economicBoard/admin/banned-users",
          adminRequests: "/economicBoard/admin/requests",
        },
      },
    ],
  } satisfies IPageIEconomicBoardSystemOverview;
}
