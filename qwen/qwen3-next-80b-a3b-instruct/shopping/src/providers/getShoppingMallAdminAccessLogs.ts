import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIShoppingMallAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccessLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAccessLogs(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallAccessLog> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_access_logs.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_access_logs.count(),
  ]);

  const mappedData = data.map((item) => {
    const result: IShoppingMallAccessLog = item.id;
    return result;
  });

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: mappedData,
  };
}
