import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellation";

export async function getShoppingMallCancellationsCancellationId(props: {
  cancellationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCancellation> {
  const { cancellationId } = props;

  const cancellation =
    await MyGlobal.prisma.shopping_mall_cancellations.findUniqueOrThrow({
      where: {
        id: cancellationId,
      },
      select: {
        id: true,
        cancellation_status: true,
      },
    });

  return {
    id: cancellation.id,
    cancellation_status: cancellation.cancellation_status,
  };
}
